import {and,eq,count} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {trialCoupons,trialRedemptions,commercialSubscriptions} from "../drizzle/commercial-draft";
import {trialGrant,TRIAL_DAYS,type TrialDays} from "../shared/admin-coupon-policy";
// Authenticated owner must be supplied by server; no public route yet.
export async function redeemTrialLab(db:MySql2Database,userId:number,code:string,clock:()=>number=Date.now){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||!/^[A-Z0-9_-]{4,40}$/.test(code))throw Error("Invalid redemption");
 return db.transaction(async tx=>{
  const [coupon]=await tx.select().from(trialCoupons).where(eq(trialCoupons.code,code)).for("update");
  if(!coupon||!TRIAL_DAYS.includes(coupon.days as TrialDays))throw Error("Coupon unavailable");
  const [existing]=await tx.select().from(trialRedemptions).where(and(eq(trialRedemptions.couponId,coupon.id),eq(trialRedemptions.userId,userId))).limit(1);
  if(existing)return {status:"already-redeemed" as const};
  const [usage]=await tx.select({total:count()}).from(trialRedemptions).where(eq(trialRedemptions.couponId,coupon.id));
  const nowMs=clock();
  const grant=trialGrant({...coupon,days:coupon.days as TrialDays,revoked:coupon.revokedAtMs!==null},nowMs,usage.total,false);
  if(!grant)throw Error("Coupon unavailable");
  await tx.insert(trialRedemptions).values({couponId:coupon.id,userId,redeemedAtMs:nowMs});
  await tx.insert(commercialSubscriptions).values({userId,plan:grant.plan,status:"active",source:"trial-coupon",sourceId:String(coupon.id),startsAtMs:grant.startsAtMs,endsAtMs:grant.endsAtMs});
  return {status:"granted" as const,...grant};
 });
}
