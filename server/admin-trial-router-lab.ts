import {readAdminReferralMetrics} from "./admin-referral-metrics-lab";
import {readAdminCommercialMetrics} from "./admin-commercial-metrics-lab";
import {readRealizedCashLab} from "./admin-finance-repository-lab";
import {readContractedMrrLab} from "./admin-recurring-repository-lab";
import {readAdminAdMetrics} from "./admin-ad-metrics-lab";
import {z} from "zod";
import {and,eq,isNull,desc,lt,count} from "drizzle-orm";
import {TRPCError} from "@trpc/server";
import {adminProcedure,router} from "./_core/trpc";
import {getDb} from "./db";
import {checkRequestOrigin,rateLimit} from "./auth-local";
import {trialCoupons,trialRedemptions,commercialAdminAudit,commercialPromotionCoupons} from "../drizzle/commercial-draft";
import {TRIAL_DAYS,couponExpiryFromIssuance,type TrialDays} from "../shared/admin-coupon-policy";
const code=z.string().regex(/^[A-Z0-9_-]{4,40}$/);
const timestamp=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
async function labDb(){
 if(process.env.LINGUA_ADMIN_LAB_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED",message:"Administração experimental indisponível."});
 const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED"});return db;
}
// Deliberately not mounted until administrative audit and isolated SQL tests exist.
export const adminTrialRouterLab=router({
 issuePromotion:adminProcedure.input(z.object({code,plan:z.enum(["lingua-premium","community-premium"]),discount:z.discriminatedUnion("kind",[z.object({kind:z.literal("percent"),basisPoints:z.number().int().min(1).max(10000)}).strict(),z.object({kind:z.literal("fixed"),currency:z.enum(["BRL","USD","EUR"]),minorUnits:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).strict()]),validity:z.discriminatedUnion("kind",[z.object({kind:z.literal("days"),days:z.number().int().positive().max(36500)}).strict(),z.object({kind:z.literal("date"),expiresAtMs:timestamp}).strict()]),maxUses:z.number().int().min(1).max(100000)}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-promo-issue:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 const db=await labDb(),now=Date.now();
 const expiry=input.validity.kind==="days"?couponExpiryFromIssuance(now,input.validity.days):input.validity.expiresAtMs;
 if(expiry===null||expiry<=now)throw new TRPCError({code:"BAD_REQUEST"});
 await db.transaction(async tx=>{
 await tx.insert(commercialPromotionCoupons).values({code:input.code,plan:input.plan,discountKind:input.discount.kind,discountValue:input.discount.kind==="percent"?input.discount.basisPoints:input.discount.minorUnits,currency:input.discount.kind==="fixed"?input.discount.currency:null,redeemFromMs:now,redeemUntilMs:expiry,maxUses:input.maxUses});
 await tx.insert(commercialAdminAudit).values({actorId:ctx.user.id,action:"promotion-issued",targetCode:input.code,occurredAtMs:now});
 });
 return {code:input.code,expiresAtMs:expiry};
 }),
 revokePromotion:adminProcedure.input(z.object({code}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-promo-revoke:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 await (await labDb()).transaction(async tx=>{
 const [coupon]=await tx.select().from(commercialPromotionCoupons).where(eq(commercialPromotionCoupons.code,input.code)).for("update");
 if(!coupon||coupon.revokedAtMs!==null)return;
 const now=Date.now();
 await tx.update(commercialPromotionCoupons).set({revokedAtMs:now}).where(eq(commercialPromotionCoupons.id,coupon.id));
 await tx.insert(commercialAdminAudit).values({actorId:ctx.user.id,action:"promotion-revoked",targetCode:input.code,occurredAtMs:now});
 });
 return {processed:true as const};
 }),
 referrals:adminProcedure.query(async({ctx})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-referrals:"+ctx.user.id);
 return readAdminReferralMetrics(await labDb());
 }),
 advertising:adminProcedure.query(async({ctx})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-advertising:"+ctx.user.id);
 return readAdminAdMetrics(await labDb());
 }),
 recurring:adminProcedure.query(async({ctx})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-recurring:"+ctx.user.id);
 return readContractedMrrLab(await labDb());
 }),
 finance:adminProcedure.input(z.object({fromMs:timestamp,toMs:timestamp}).strict().refine(v=>v.toMs>v.fromMs&&v.toMs-v.fromMs<=366*86400000)).query(async({ctx,input})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-finance:"+ctx.user.id);
 return readRealizedCashLab(await labDb(),input.fromMs,input.toMs);
 }),
 metrics:adminProcedure.query(async({ctx})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-commercial-metrics:"+ctx.user.id);
 return readAdminCommercialMetrics(await labDb());
 }),
 coupons:adminProcedure.input(z.object({beforeId:z.number().int().positive().optional()}).strict()).query(async({ctx,input})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-coupon-list:"+ctx.user.id);
 const db=await labDb();
 return db.transaction(async tx=>{
 const rows=await tx.select().from(trialCoupons).where(input.beforeId===undefined?undefined:lt(trialCoupons.id,input.beforeId)).orderBy(desc(trialCoupons.id)).limit(51);
 const items=await Promise.all(rows.slice(0,50).map(async coupon=>{
 const [usage]=await tx.select({total:count()}).from(trialRedemptions).where(eq(trialRedemptions.couponId,coupon.id));
 return {...coupon,uses:usage.total};
 }));
 return {items,nextBeforeId:rows.length>50?items[items.length-1].id:null,asOfMs:Date.now()};
 });
 }),
 issue:adminProcedure.input(z.object({code,plan:z.enum(["lingua-premium","community-premium"]),days:z.number().int().refine(n=>TRIAL_DAYS.includes(n as TrialDays)),validity:z.discriminatedUnion("kind",[z.object({kind:z.literal("days"),days:z.number().int().positive().max(36500)}).strict(),z.object({kind:z.literal("date"),expiresAtMs:timestamp}).strict()]),maxUses:z.number().int().min(1).max(100000)}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-trial-issue:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 const {validity,...fields}=input;
 const db=await labDb();const issuedAtMs=Date.now();
 const expiry=validity.kind==="days"?couponExpiryFromIssuance(issuedAtMs,validity.days):validity.expiresAtMs;
 if(expiry===null||expiry<=issuedAtMs)throw new TRPCError({code:"BAD_REQUEST"});
 await db.transaction(async tx=>{
 await tx.insert(trialCoupons).values({...fields,redeemFromMs:issuedAtMs,redeemUntilMs:expiry});
 await tx.insert(commercialAdminAudit).values({actorId:ctx.user.id,action:"trial-issued",targetCode:input.code,occurredAtMs:issuedAtMs});
 });
 return {issued:true as const,code:input.code,issuedAtMs,expiresAtMs:expiry};
 }),
 revoke:adminProcedure.input(z.object({code}).strict()).mutation(async({ctx,input})=>{
 checkRequestOrigin(ctx.req);rateLimit("admin-trial-revoke:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 await (await labDb()).transaction(async tx=>{
 const [coupon]=await tx.select().from(trialCoupons).where(eq(trialCoupons.code,input.code)).for("update");
 if(!coupon||coupon.revokedAtMs!==null)return;
 const now=Date.now();
 await tx.update(trialCoupons).set({revokedAtMs:now}).where(and(eq(trialCoupons.code,input.code),isNull(trialCoupons.revokedAtMs)));
 await tx.insert(commercialAdminAudit).values({actorId:ctx.user.id,action:"trial-revoked",targetCode:input.code,occurredAtMs:now});
 });
 return {processed:true as const};
 })
});
