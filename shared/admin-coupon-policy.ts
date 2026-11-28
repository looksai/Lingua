import type {CommercialPlan} from "./commercial-entitlements";
export const TRIAL_DAYS=[30,60,90,120,150,180] as const;
export type TrialDays=typeof TRIAL_DAYS[number];
export type TrialCoupon={code:string;plan:CommercialPlan;days:TrialDays;redeemFromMs:number;redeemUntilMs:number;maxUses:number;revoked:boolean};
export function trialGrant(coupon:TrialCoupon,nowMs:number,uses:number,alreadyRedeemed:boolean){
 if(!/^[A-Z0-9_-]{4,40}$/.test(coupon.code)||!["lingua-premium","community-premium"].includes(coupon.plan)||!TRIAL_DAYS.includes(coupon.days)||coupon.revoked!==false||alreadyRedeemed!==false)return null;
 if(![nowMs,uses,coupon.redeemFromMs,coupon.redeemUntilMs,coupon.maxUses].every(Number.isSafeInteger)||nowMs<0||coupon.redeemFromMs<0||nowMs<coupon.redeemFromMs||nowMs>=coupon.redeemUntilMs||uses<0||coupon.maxUses<=0||uses>=coupon.maxUses)return null;
 const endsAtMs=nowMs+coupon.days*86400000;
 if(!Number.isSafeInteger(endsAtMs))return null;
 return {plan:coupon.plan,startsAtMs:nowMs,endsAtMs,source:"trial-coupon" as const,automaticCharge:false as const};
}
// Caller must enforce owner identity and atomically reserve redemption before granting access.
