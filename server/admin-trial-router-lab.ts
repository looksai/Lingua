import {z} from "zod";
import {and,eq,isNull} from "drizzle-orm";
import {TRPCError} from "@trpc/server";
import {adminProcedure,router} from "./_core/trpc";
import {getDb} from "./db";
import {checkRequestOrigin,rateLimit} from "./auth-local";
import {trialCoupons} from "../drizzle/commercial-draft";
import {TRIAL_DAYS,type TrialDays} from "../shared/admin-coupon-policy";
const code=z.string().regex(/^[A-Z0-9_-]{4,40}$/);
const timestamp=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
async function labDb(){
 if(process.env.LINGUA_ADMIN_LAB_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED",message:"Administração experimental indisponível."});
 const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED"});return db;
}
// Deliberately not mounted until administrative audit and isolated SQL tests exist.
export const adminTrialRouterLab=router({
 issue:adminProcedure.input(z.object({code,plan:z.enum(["lingua-premium","community-premium"]),days:z.number().int().refine(n=>TRIAL_DAYS.includes(n as TrialDays)),redeemFromMs:timestamp,redeemUntilMs:timestamp,maxUses:z.number().int().min(1).max(100000)}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-trial-issue:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 if(input.redeemUntilMs<=Math.max(Date.now(),input.redeemFromMs))throw new TRPCError({code:"BAD_REQUEST"});
 await (await labDb()).insert(trialCoupons).values(input);
 return {issued:true as const,code:input.code};
 }),
 revoke:adminProcedure.input(z.object({code}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-trial-revoke:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 await (await labDb()).update(trialCoupons).set({revokedAtMs:Date.now()}).where(and(eq(trialCoupons.code,input.code),isNull(trialCoupons.revokedAtMs)));
 return {processed:true as const};
 })
});
