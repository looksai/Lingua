import {describe,it,expect} from "vitest";
import {TRIAL_DAYS,couponExpiryFromIssuance,trialGrant,type TrialCoupon} from "../shared/admin-coupon-policy";
const coupon:TrialCoupon={code:"LINGUA30",plan:"lingua-premium",days:30,redeemFromMs:10,redeemUntilMs:100,maxUses:2,revoked:false};
describe("trial coupons",()=>{
 it("grants each supported duration from redemption without charging",()=>{
 for(const days of TRIAL_DAYS)expect(trialGrant({...coupon,days},50,0,false)).toEqual({plan:"lingua-premium",startsAtMs:50,endsAtMs:50+days*86400000,source:"trial-coupon",automaticCharge:false});
 });
 it("denies exhausted, repeated, revoked, premature and expired redemption",()=>{
 expect(trialGrant(coupon,50,2,false)).toBeNull();
 expect(trialGrant(coupon,50,0,true)).toBeNull();
 expect(trialGrant({...coupon,revoked:true},50,0,false)).toBeNull();
 expect(trialGrant(coupon,9,0,false)).toBeNull();
 expect(trialGrant(coupon,100,0,false)).toBeNull();
 });
});

it("keeps redemption validity independent of trial duration",()=>{
 const issued=1000;const expiry=couponExpiryFromIssuance(issued,3)!;
 expect(expiry).toBe(issued+3*86400000);
 expect(couponExpiryFromIssuance(issued,365)).toBe(issued+365*86400000);
 const c={...coupon,days:150 as const,redeemFromMs:issued,redeemUntilMs:expiry};
 expect(trialGrant(c,expiry-1,0,false)?.endsAtMs).toBe(expiry-1+150*86400000);
 expect(trialGrant(c,expiry,0,false)).toBeNull();
 expect(couponExpiryFromIssuance(issued,0)).toBeNull();
 expect(couponExpiryFromIssuance(Number.MAX_SAFE_INTEGER,3)).toBeNull();
});
