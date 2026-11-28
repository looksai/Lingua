import {and,count,countDistinct,eq,gt,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {partnersDraft as partners} from "../drizzle/partner-foundation-draft";
import {users} from "../drizzle/schema";
import {commercialSubscriptions as subscriptions,trialCoupons,trialRedemptions} from "../drizzle/commercial-draft";
// Administrative repository only; caller must enforce admin authorization.
export async function readAdminCommercialMetrics(db:MySql2Database,nowMs=Date.now()){
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid reporting time");
 const active=and(eq(subscriptions.status,"active"),lte(subscriptions.startsAtMs,nowMs),gt(subscriptions.endsAtMs,nowMs));
 return db.transaction(async tx=>{
 const [registered]=await tx.select({total:count()}).from(users);
 const [members]=await tx.select({total:countDistinct(subscriptions.userId)}).from(subscriptions).where(active);
 const [paid]=await tx.select({total:countDistinct(subscriptions.userId)}).from(subscriptions).where(and(active,eq(subscriptions.source,"paid")));
 const [trial]=await tx.select({total:countDistinct(subscriptions.userId)}).from(subscriptions).where(and(active,eq(subscriptions.source,"trial-coupon")));
 const [coupons]=await tx.select({total:count()}).from(trialCoupons);
 const [redemptions]=await tx.select({total:count()}).from(trialRedemptions);
 const partnerRows=await tx.select({status:partners.status,total:count()}).from(partners).groupBy(partners.status);
 const companies={pending:0,active:0,suspended:0};
 for(const row of partnerRows)companies[row.status]=row.total;
 return {companies:{...companies,total:companies.pending+companies.active+companies.suspended},asOfMs:nowMs,registeredAccounts:registered.total,activeMembers:members.total,activePaidMembers:paid.total,activeTrialMembers:trial.total,trialCouponsIssued:coupons.total,trialRedemptions:redemptions.total};
 });
}
