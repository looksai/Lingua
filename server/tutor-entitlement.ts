/**
 * Staging-only durable tutor gate. A successful AI chat costs one message.
 * A reservation counts against the 20-message window immediately so concurrent
 * requests cannot pass the limit; failures release their reservation.
 *
 * All admission and settlement mutations are serialized by the per-user
 * tutorTrialState row (SELECT ... FOR UPDATE) in the same MySQL database.
 * No browser supplied flags grant Premium access, and no chat content is saved.
 */
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { billingSubscriptions, tutorTrialState, tutorUsage } from "../drizzle/schema";
import { getDb } from "./db";
import {
  billingFeatureEnabled, premiumAllowed, trialAllowsNewChat,
  TRIAL_HOURS, TRIAL_SUCCESSFUL_REPLY_LIMIT,
} from "./billing-policy";
import { allowedBillingPriceIds, assertBillingSandbox, billingStatusForUser } from "./billing-store";

const RESERVATION_TTL_MS = 10 * 60_000;
export type TutorReservation = {userId:number; interactionId:string; trial:boolean};

export function quotaExceeded():never {
  throw new TRPCError({code:"FORBIDDEN",message:"LIMIT_REACHED"});
}
function gateUnavailable():never {
  throw new TRPCError({code:"PRECONDITION_FAILED",message:"O acesso ao tutor está temporariamente indisponível. Nenhum uso foi consumido."});
}
export function validTutorInteractionId(value:unknown):value is string{
  return typeof value==="string" && /^[A-Za-z0-9_-]{12,120}$/.test(value);
}
export function hasTrialSlot(successfulReplies:number,reserved:number,eligible:boolean):boolean {
  return eligible && Number.isSafeInteger(successfulReplies) &&
    Number.isSafeInteger(reserved) && successfulReplies>=0 && reserved>=0 &&
    successfulReplies + reserved < TRIAL_SUCCESSFUL_REPLY_LIMIT;
}

export async function reserveTutorChat(
  userId:number, interactionId:string|undefined, now=new Date(),
):Promise<TutorReservation|null>{
  if(!billingFeatureEnabled())return null;
  if(!validTutorInteractionId(interactionId))throw new TRPCError({code:"BAD_REQUEST",message:"Identificador de envio inválido."});
  assertBillingSandbox(); // Never gate learners if test-mode Stripe is not configured.
  const db=await getDb();if(!db)gateUnavailable();
  try{
    return await db!.transaction(async tx=>{
      // Create a durable, user-owned lock row. The FK enforces existing account.
      await tx.insert(tutorTrialState).values({userId}).onDuplicateKeyUpdate({set:{userId}});
      const [trial]=await tx.select().from(tutorTrialState)
        .where(eq(tutorTrialState.userId,userId)).limit(1).for("update");
      if(!trial)gateUnavailable();
      // A failed/succeeded request ID can never be replayed to obtain free AI.
      const [prior]=await tx.select({id:tutorUsage.id}).from(tutorUsage)
        .where(and(eq(tutorUsage.userId,userId),eq(tutorUsage.interactionId,interactionId))).limit(1);
      if(prior)throw new TRPCError({code:"CONFLICT",message:"Este envio já foi recebido. Crie uma nova mensagem para tentar novamente."});
      const subscriptions=await tx.select().from(billingSubscriptions)
        .where(eq(billingSubscriptions.userId,userId));
      const paid=premiumAllowed(subscriptions.map(s=>({...s,cancelAtPeriodEnd:s.cancelAtPeriodEnd===1})),allowedBillingPriceIds(),now);
      if(!paid){
        if(!trialAllowsNewChat(trial,now))quotaExceeded();
        // Crash recovery: a >10-minute reservation is no longer claimable and
        // cannot block a fresh send forever.
        const cutoff=new Date(now.getTime()-RESERVATION_TTL_MS);
        await tx.update(tutorUsage).set({state:"failed",countable:0,completedAt:now})
          .where(and(eq(tutorUsage.userId,userId),eq(tutorUsage.kind,"chat"),
            eq(tutorUsage.state,"reserved"),lt(tutorUsage.createdAt,cutoff)));
        const [reserved]=await tx.select({count:sql<number>`count(*)`}).from(tutorUsage)
          .where(and(eq(tutorUsage.userId,userId),eq(tutorUsage.kind,"chat"),
            eq(tutorUsage.state,"reserved"),gt(tutorUsage.createdAt,cutoff)));
        if(!hasTrialSlot(trial.successfulReplies,Number(reserved?.count??0),true))quotaExceeded();
      }
      await tx.insert(tutorUsage).values({
        userId,interactionId,kind:"chat",state:"reserved",countable:paid?0:1,
        createdAt:now,
      });
      return {userId,interactionId,trial:!paid};
    });
  }catch(error){
    if(error instanceof TRPCError)throw error;
    // Schema missing, transient DB failure, lock timeout: fail closed.
    return gateUnavailable();
  }
}

export async function completeTutorChat(
  reservation:TutorReservation|null, succeeded:boolean, now=new Date(),
):Promise<void>{
  if(!reservation)return;
  const db=await getDb();if(!db)gateUnavailable();
  try{
    await db!.transaction(async tx=>{
      const [trial]=await tx.select().from(tutorTrialState)
        .where(eq(tutorTrialState.userId,reservation.userId)).limit(1).for("update");
      if(!trial)gateUnavailable();
      const [usage]=await tx.select().from(tutorUsage).where(and(
        eq(tutorUsage.userId,reservation.userId),
        eq(tutorUsage.interactionId,reservation.interactionId),
      )).limit(1);
      if(!usage||usage.state!=="reserved") {
        if(succeeded)gateUnavailable(); // Stale/completed requests cannot be counted twice.
        return;
      }
      const countThis=succeeded && usage.countable===1;
      await tx.update(tutorUsage).set({
        state:succeeded?"succeeded":"failed",countable:countThis?1:0,completedAt:now,
      }).where(eq(tutorUsage.id,usage.id));
      if(countThis){
        const started=trial.trialStartedAt??now;
        await tx.update(tutorTrialState).set({
          successfulReplies:sql`${tutorTrialState.successfulReplies}+1`,
          trialStartedAt:started,
          trialEndsAt:trial.trialEndsAt??new Date(started.getTime()+TRIAL_HOURS*60*60_000),
        }).where(eq(tutorTrialState.userId,reservation.userId));
      }
    });
  }catch(error){
    if(error instanceof TRPCError)throw error;
    return gateUnavailable();
  }
}

/** ASR and TTS requests never increment the 20-message quota, but must not
 * escape the paywall after it is exhausted. Existing per-process cost budget
 * continues to constrain these endpoints in staging.
 */
export async function assertAuxiliaryTutorAccess(userId:number):Promise<void>{
  if(!billingFeatureEnabled())return;
  assertBillingSandbox();
  const status=await billingStatusForUser(userId);
  if(status.access==="blocked")quotaExceeded();
  if(status.access==="disabled")gateUnavailable();
}

/** Settlement is part of the request contract; failed AI requests never spend
 * a free message. The process-local backstop still runs outside this wrapper.
 */
export async function withTutorChatQuota<T extends {source:"local"|"ai"}>(
  userId:number,interactionId:string|undefined,operation:()=>Promise<T>,
):Promise<T>{
  const reservation=await reserveTutorChat(userId,interactionId);
  let settled=false;
  try{
    const response=await operation();
    await completeTutorChat(reservation,response.source==="ai");
    settled=true;
    return response;
  }catch(error){
    if(!settled){
      try{await completeTutorChat(reservation,false);}
      catch{console.warn("[billing] quota settlement cleanup failed");}
    }
    throw error;
  }
}
