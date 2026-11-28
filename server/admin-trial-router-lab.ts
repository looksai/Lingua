import {academyAdmissionMode} from "./academy-admission";
import {inspectBetaInvitations} from "./academy-beta-invite-ops";
import {actionCommunityReport} from "./community-report-lab";
import {communityPublicationAudit,communityPublicationReports} from "../drizzle/community-safety-draft";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
import {setCommunityPublicationRestriction,setCommunityRestriction} from "./community-safety-lab";
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
import {trialCoupons,trialRedemptions,commercialAdminAudit,commercialPromotionCoupons,commercialPromotionRedemptions} from "../drizzle/commercial-draft";
import {TRIAL_DAYS,couponExpiryFromIssuance,type TrialDays} from "../shared/admin-coupon-policy";
const code=z.string().regex(/^[A-Z0-9_-]{4,40}$/);
const timestamp=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
async function labDb(){
 if(process.env.LINGUA_ADMIN_LAB_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED",message:"Administração experimental indisponível."});
 const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED"});return db;
}
// Deliberately not mounted until administrative audit and isolated SQL tests exist.
export const adminTrialRouterLab=router({
 setCommunitySuspension:adminProcedure.input(z.object({targetId:z.number().int().positive().max(2147483647),suspended:z.boolean()}).strict()).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);rateLimit("admin-community-suspension:"+ctx.user.id);
   ctx.res.setHeader("Cache-Control","private, no-store");
   await setCommunityRestriction(await labDb(),ctx.user.id,input.targetId,input.suspended);
   return {processed:true};
 }),
 communityReportSummary:adminProcedure.query(async({ctx})=>{
   ctx.res.setHeader("Cache-Control","private, no-store");
   rateLimit("admin-community-summary:"+ctx.user.id,Date.now(),60);
   const db=await labDb();
   const rows=await Promise.all((["pending","dismissed","actioned"] as const).map(async status=>{
     const [result]=await db.select({total:count()}).from(communityPublicationReports).where(eq(communityPublicationReports.status,status));
     return {status,total:result?.total??0};
   }));
   return {pending:rows[0].total,dismissed:rows[1].total,actioned:rows[2].total};
 }),
 communityReports:adminProcedure.input(z.object({status:z.enum(["pending","dismissed","actioned"]).default("pending"),beforeId:z.number().int().positive().max(2147483647).optional()}).strict()).query(async({ctx,input})=>{
   ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-community-reports:"+ctx.user.id,Date.now(),60);
   const db=await labDb();
   const rows=await db.select().from(communityPublicationReports).where(and(eq(communityPublicationReports.status,input.status),input.beforeId===undefined?undefined:lt(communityPublicationReports.id,input.beforeId))).orderBy(desc(communityPublicationReports.id)).limit(51);
   const items=rows.slice(0,50);
   return {items,nextBeforeId:rows.length>50?items[49].id:null};
 }),
 actionCommunityReport:adminProcedure.input(z.object({reportId:z.number().int().positive().max(2147483647)}).strict()).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);rateLimit("admin-community-report-resolution:"+ctx.user.id,Date.now(),60);
   ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await labDb();
   return actionCommunityReport(db,ctx.user.id,input.reportId);
 }),
 dismissCommunityReport:adminProcedure.input(z.object({reportId:z.number().int().positive().max(2147483647)}).strict()).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);rateLimit("admin-community-report-resolution:"+ctx.user.id,Date.now(),60);
   ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await labDb();
   await db.transaction(async tx=>{
     const [report]=await tx.select().from(communityPublicationReports).where(eq(communityPublicationReports.id,input.reportId)).for("update");
     if(!report)throw new TRPCError({code:"NOT_FOUND"});
     if(report.status!=="pending")return;
     await tx.update(communityPublicationReports).set({status:"dismissed",resolvedAtMs:Date.now(),resolvedBy:ctx.user.id}).where(eq(communityPublicationReports.id,input.reportId));
   });
   return {processed:true as const};
 }),
 communityPublicationAudit:adminProcedure.input(z.object({beforeId:z.number().int().positive().max(2147483647).optional()}).strict()).query(async({ctx,input})=>{
   ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-community-audit:"+ctx.user.id,Date.now(),60);
   const db=await labDb();
   const rows=await db.select().from(communityPublicationAudit).where(input.beforeId===undefined?undefined:lt(communityPublicationAudit.id,input.beforeId)).orderBy(desc(communityPublicationAudit.id)).limit(51);
   const items=rows.slice(0,50);
   return {items,nextBeforeId:rows.length>50?items[49].id:null};
 }),
 setCommunityPublicationHidden:adminProcedure.input(z.object({ownerId:z.number().int().positive().max(2147483647),achievementId:z.string().max(80).refine(id=>ACHIEVEMENTS.some(a=>a.id===id)),hidden:z.boolean()}).strict()).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);rateLimit("admin-community-publication:"+ctx.user.id);
   ctx.res.setHeader("Cache-Control","private, no-store");
   await setCommunityPublicationRestriction(await labDb(),ctx.user.id,input.ownerId,input.achievementId,input.hidden);
   return {processed:true as const};
 }),
 promotions:adminProcedure.input(z.object({beforeId:z.number().int().positive().optional()}).strict()).query(async({ctx,input})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("admin-promotion-list:"+ctx.user.id);
 return (await labDb()).transaction(async tx=>{
 const rows=await tx.select().from(commercialPromotionCoupons).where(input.beforeId===undefined?undefined:lt(commercialPromotionCoupons.id,input.beforeId)).orderBy(desc(commercialPromotionCoupons.id)).limit(51);
 const items=[];
 for(const coupon of rows.slice(0,50)){
 const [usage]=await tx.select({total:count()}).from(commercialPromotionRedemptions).where(eq(commercialPromotionRedemptions.couponId,coupon.id));
 items.push({...coupon,uses:usage.total});
 }
 return {items,nextBeforeId:rows.length>50?items[49].id:null,asOfMs:Date.now()};
 });
 }),
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
 academyInviteSummary:adminProcedure.query(async({ctx})=>{
  ctx.res.setHeader("Cache-Control","private, no-store");
  rateLimit("admin-academy-invite-summary:"+ctx.user.id,Date.now(),60);
  await labDb();
  const admissionMode=academyAdmissionMode();
  const raw=process.env.ACADEMY_INVITATIONS_JSON;
  if(!raw)return {configured:false as const,admissionMode};
  try{
   const {total,active,expired,availableSlots}=inspectBetaInvitations(raw);
   return {configured:true as const,admissionMode,total,active,expired,availableSlots};
  }catch{return {configured:false as const,admissionMode};}
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
