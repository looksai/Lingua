/** Database-backed Stripe checkout and webhook reconciliation for staging only.
 * No call happens unless explicitly enabled and a test-mode secret is present.
 * Ownership is always resolved via authenticated ctx.user or the persisted
 * stripeCustomerId mapping, never email or inbound webhook metadata.
 */
import { randomUUID } from "node:crypto";
import { and, eq, gt, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { billingCheckoutAttempts, billingCustomers, billingSubscriptions,
  stripeWebhookEvents, tutorTrialState, users } from "../drizzle/schema";
import { getDb } from "./db";
import { billingFeatureEnabled, paidOrTrial, premiumAllowed } from "./billing-policy";
import { asObject, createStripeTransport, stripeId, stripeRefId, type StripeJson, type StripeTransport } from "./stripe-http";
import { BILLING_EVENT_TYPES, eventScope, projectStripeSubscription, validStripeMonthlyPrice } from "./stripe-projection";

function unavailable():never{
  throw new TRPCError({code:"PRECONDITION_FAILED",message:"Cobrança de testes ainda indisponível."});
}
export function assertBillingSandbox(env:NodeJS.ProcessEnv=process.env){
  if(!billingFeatureEnabled(env) || !env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
     !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))unavailable();
  const base=env.PUBLIC_APP_URL;
  if(!base || !/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(base) ||
     base!=="https://lingua-p1-staging-le7u.onrender.com") unavailable();
}
export function allowedBillingPriceIds(env:NodeJS.ProcessEnv=process.env):ReadonlySet<string>{
  const ids=[env.STRIPE_PRICE_USD_MONTHLY,env.STRIPE_PRICE_BRL_MONTHLY];
  return new Set(ids.filter((s):s is string=>Boolean(stripeId(s,"price"))));
}
export function billingCurrencyPrice(currency:"usd"|"brl",env=process.env):string{
  const price=currency==="usd"?env.STRIPE_PRICE_USD_MONTHLY:env.STRIPE_PRICE_BRL_MONTHLY;
  if(!stripeId(price,"price"))unavailable();
  return price!;
}
export function billingTesterAllowed(email:string|null|undefined,env=process.env):boolean{
  const list=(env.STRIPE_BILLING_ALLOWED_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
  return !!email&&list.includes(email.trim().toLowerCase());
}
type DB = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function dbOrError():Promise<DB>{const db=await getDb();if(!db)unavailable();return db!;}
function stripePath(kind:"customers"|"subscriptions"|"invoices"|"checkout/sessions",id:string){
  return "/v1/"+kind+"/"+encodeURIComponent(id);
}
function checkoutUrl(value:unknown):string|null{
  if(typeof value!=="string"||value.length>2048)return null;
  try{const u=new URL(value);return u.protocol==="https:"&&u.hostname==="checkout.stripe.com"?value:null;}
  catch{return null;}
}

export async function billingStatusForUser(userId:number, now=new Date()){
  if(!billingFeatureEnabled())return {enabled:false as const, access:"disabled" as const, remainingReplies:null, expiresAt:null};
  const db=await dbOrError();
  const [subs,trial]=await Promise.all([
    db.select().from(billingSubscriptions).where(eq(billingSubscriptions.userId,userId)),
    db.select().from(tutorTrialState).where(eq(tutorTrialState.userId,userId)).limit(1),
  ]);
  const allowed=allowedBillingPriceIds();
  const status=paidOrTrial(subs.map(s=>({...s,cancelAtPeriodEnd:s.cancelAtPeriodEnd===1})),allowed,trial[0]??null,now);
  return {enabled:true as const,access:status,
    remainingReplies:Math.max(0,20-(trial[0]?.successfulReplies??0)),
    expiresAt:trial[0]?.trialEndsAt??null};
}

async function createOrFindCustomer(userId:number,client:StripeTransport):Promise<string>{
  const db=await dbOrError();
  const [existing]=await db.select().from(billingCustomers).where(eq(billingCustomers.userId,userId)).limit(1);
  if(existing)return existing.stripeCustomerId;
  // Repeated requests use precisely the same parameters and Stripe idempotency key.
  const created=await client.post("/v1/customers",{"metadata[lingua_user_id]":String(userId)},
    "lingua-customer-v1:"+userId);
  const customerId=stripeId(created.id,"cus");
  if(!customerId || created.livemode!==false)unavailable();
  await db.insert(billingCustomers).values({userId,stripeCustomerId:customerId}).onDuplicateKeyUpdate({
    set:{userId},
  });
  const [linked]=await db.select().from(billingCustomers).where(eq(billingCustomers.userId,userId)).limit(1);
  if(!linked || linked.stripeCustomerId!==customerId)unavailable();
  return customerId;
}
async function checkNoStripeSubscription(customerId:string,client:StripeTransport){
  const response=await client.get("/v1/subscriptions",{customer:customerId,status:"all",limit:"100"});
  const subscriptions=Array.isArray(response.data)?response.data:[];
  // Fail closed if there may be more subscriptions than the checked page.
  if(response.has_more===true || !Array.isArray(response.data))unavailable();
  if(subscriptions.some(row=>{
    const s=asObject(row);return !s || !["canceled","incomplete_expired"].includes(String(s.status));
  }))throw new TRPCError({code:"CONFLICT",message:"Já existe uma assinatura associada a esta conta. Consulte o suporte ou o portal."});
}
export async function createBillingCheckout(
  userId:number,
  email:string|null,
  currency:"usd"|"brl",
  attemptId:string,
  client:StripeTransport=createStripeTransport(),
):Promise<{url:string}>{
  assertBillingSandbox();
  if(!billingTesterAllowed(email))unavailable();
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(attemptId))
    throw new TRPCError({code:"BAD_REQUEST",message:"Tentativa de pagamento inválida."});
  const db=await dbOrError(),now=new Date();
  const price=billingCurrencyPrice(currency),allowed=allowedBillingPriceIds();
  const customerId=await createOrFindCustomer(userId,client);
  const cached=await db.transaction(async tx=>{
    const [owner]=await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).limit(1).for("update");
    if(!owner)unavailable();
    const subs=await tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.userId,userId));
    if(premiumAllowed(subs.map(s=>({...s,cancelAtPeriodEnd:s.cancelAtPeriodEnd===1})),allowed,now))
      throw new TRPCError({code:"CONFLICT",message:"Você já possui uma assinatura ativa."});
    const active=await tx.select().from(billingCheckoutAttempts)
      .where(and(eq(billingCheckoutAttempts.userId,userId),gt(billingCheckoutAttempts.expiresAt,now)))
      .orderBy(desc(billingCheckoutAttempts.createdAt)).limit(3);
    const other=active.find(a=>a.attemptId!==attemptId && a.state!=="failed");
    if(other)throw new TRPCError({code:"CONFLICT",message:"Já existe um checkout em andamento para esta conta."});
    const match=active.find(a=>a.attemptId===attemptId);
    if(match){
      if(match.state==="failed"||match.currency!==currency||match.stripePriceId!==price)unavailable();
      return {cached:checkoutUrl(match.sessionUrl),expiresAt:match.expiresAt};
    }
    // A prior timed-out attempt cannot be reused with a new Stripe idempotency
    // window: the old session may still have been paid asynchronously.
    const [old]=await tx.select().from(billingCheckoutAttempts)
      .where(and(eq(billingCheckoutAttempts.userId,userId),eq(billingCheckoutAttempts.attemptId,attemptId))).limit(1);
    if(old)unavailable();
    await tx.insert(billingCheckoutAttempts).values({
      userId,attemptId,currency,stripePriceId:price,state:"creating",expiresAt:new Date(now.getTime()+35*60000),
    });
    return {cached:null,expiresAt:new Date(now.getTime()+35*60000)};
  });
  if(cached.cached)return {url:cached.cached};
  // Read the authoritative Stripe state, not solely possibly delayed webhooks.
  await checkNoStripeSubscription(customerId,client);
  const stripePrice=await client.get("/v1/prices/"+encodeURIComponent(price));
  if(!validStripeMonthlyPrice(stripePrice,price,currency))unavailable();
  const session=await client.post("/v1/checkout/sessions",{
    mode:"subscription",customer:customerId,client_reference_id:String(userId),
    "line_items[0][price]":price,"line_items[0][quantity]":"1",
    success_url:process.env.PUBLIC_APP_URL+"/billing/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url:process.env.PUBLIC_APP_URL+"/premium",
    "subscription_data[metadata][lingua_user_id]":String(userId),
    expires_at:String(Math.floor(cached.expiresAt.getTime()/1000)),
  },"lingua-checkout-v1:"+userId+":"+attemptId);
  const url=checkoutUrl(session.url),sessionId=stripeId(session.id,"cs");
  if(!sessionId || !url || session.mode!=="subscription" || session.livemode!==false ||
     stripeRefId(session.customer,"cus")!==customerId)unavailable();
  await db.update(billingCheckoutAttempts).set({
    state:"created",stripeCheckoutSessionId:sessionId,sessionUrl:url,
  }).where(and(eq(billingCheckoutAttempts.userId,userId),eq(billingCheckoutAttempts.attemptId,attemptId)));
  return {url};
}
export async function createBillingPortal(userId:number,email:string|null,client:StripeTransport=createStripeTransport()){
  assertBillingSandbox();
  if(!billingTesterAllowed(email))unavailable();
  const db=await dbOrError();
  const [link]=await db.select().from(billingCustomers).where(eq(billingCustomers.userId,userId)).limit(1);
  if(!link)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Nenhuma assinatura para gerenciar."});
  const session=await client.post("/v1/billing_portal/sessions",{
    customer:link.stripeCustomerId,return_url:process.env.PUBLIC_APP_URL+"/premium",
  });
  if(typeof session.url!=="string")unavailable();
  const url=new URL(session.url);
  if(url.protocol!=="https:" || url.hostname!=="billing.stripe.com")unavailable();
  return {url:url.toString()};
}

/** Called only after cryptographic Stripe-Signature verification. Commit event
 * receipt and entitlement in one MySQL transaction. Per-customer FOR UPDATE
 * serializes reconciliation, including a fresh Stripe GET inside the lock.
 * 5xx on any failure forces a retry; no half-committed access grant.
 */
export async function reconcileSignedStripeEvent(
  event:StripeJson,
  client:StripeTransport=createStripeTransport(),
):Promise<"processed"|"duplicate"|"ignored">{
  assertBillingSandbox();
  if(typeof event.type!=="string"||!BILLING_EVENT_TYPES.has(event.type))return "ignored";
  const scope=eventScope(event);
  if(!scope)throw new Error("Unexpected signed Stripe event structure");
  const db=await dbOrError();
  return db.transaction(async tx=>{
    const [customer]=await tx.select().from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId,scope.customerId!)).limit(1).for("update");
    if(!customer)throw new Error("Unknown Stripe customer link: retry after checkout persistence");
    const [prior]=await tx.select().from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId,scope.id)).limit(1).for("update");
    if(prior?.status==="done")return "duplicate" as const;
    let sid=scope.subscriptionId;
    if(scope.sessionId){
      const session=await client.get(stripePath("checkout/sessions",scope.sessionId));
      if(session.livemode!==false || stripeRefId(session.customer,"cus")!==customer.stripeCustomerId ||
        session.mode!=="subscription" || session.id!==scope.sessionId ||
        session.client_reference_id!==String(customer.userId))
        throw new Error("Stripe checkout ownership verification failed");
      sid=stripeRefId(session.subscription,"sub");
    }
    if(sid){
      let subscription:StripeJson|null=null,projection:ReturnType<typeof projectStripeSubscription>=null;
      try{
        subscription=await client.get(stripePath("subscriptions",sid));
        const invId=stripeRefId(subscription.latest_invoice,"in");
        const invoice=invId?await client.get(stripePath("invoices",invId)):null;
        projection=projectStripeSubscription(subscription,invoice,customer.stripeCustomerId,allowedBillingPriceIds());
      }catch(error){
        // A signed subscription.deleted may be unretrievable after cancellation.
        // A failure for any other event must be retried; never grant by guess.
        if(scope.type!=="customer.subscription.deleted")throw error;
      }
      const [existing]=await tx.select().from(billingSubscriptions)
        .where(eq(billingSubscriptions.stripeSubscriptionId,sid)).limit(1).for("update");
      if(existing && existing.userId!==customer.userId)throw new Error("Subscription ownership conflict");
      if(projection){
        const values={stripePriceId:projection.stripePriceId,currency:projection.currency,
          status:scope.type==="customer.subscription.deleted"?"canceled":projection.status,
          currentPeriodEnd:projection.currentPeriodEnd,
          paidThroughAt:scope.type==="customer.subscription.deleted"?null:projection.paidThroughAt,
          cancelAtPeriodEnd:projection.cancelAtPeriodEnd?1:0,lastSyncedAt:new Date()};
        if(existing)await tx.update(billingSubscriptions).set(values)
          .where(eq(billingSubscriptions.stripeSubscriptionId,sid));
        else await tx.insert(billingSubscriptions).values({
          stripeSubscriptionId:sid,userId:customer.userId,...values,
        });
      }else if(existing){
        // Revocation is safe even if the API returned an unexpected plan/state.
        await tx.update(billingSubscriptions).set({status:"unverified",paidThroughAt:null,lastSyncedAt:new Date()})
          .where(eq(billingSubscriptions.stripeSubscriptionId,sid));
      }else if(scope.type!=="checkout.session.completed"){
        // No verified subscription means no access is granted.
        throw new Error("Subscription cannot be safely reconciled");
      }
    }
    if(prior)await tx.update(stripeWebhookEvents).set({status:"done",processedAt:new Date()})
      .where(eq(stripeWebhookEvents.stripeEventId,scope.id));
    else await tx.insert(stripeWebhookEvents).values({
      stripeEventId:scope.id,eventType:scope.type,eventCreatedAt:scope.createdAt,
      status:"done",processedAt:new Date(),
    });
    return "processed" as const;
  });
}
