import { describe, expect, it } from "vitest";
import { billingFeatureEnabled, paidOrTrial, premiumAllowed, trialAllowsNewChat, TRIAL_SUCCESSFUL_REPLY_LIMIT } from "./billing-policy";

const now=new Date("2026-11-23T12:00:00Z");
const active={status:"active",stripePriceId:"price_test_usd",currentPeriodEnd:new Date("2026-12-23T12:00:00Z"),
  paidThroughAt:new Date("2026-12-23T12:00:00Z"),cancelAtPeriodEnd:false};
const prices=new Set(["price_test_usd"]);
const prior=new Date(now.getTime()-24*60*60*1000);
const trial={trialStartedAt:prior,trialEndsAt:new Date(prior.getTime()+72*60*60*1000),successfulReplies:2};

describe("Stripe paywall policy candidate (not deployed)",()=>{
  it("billing defaults to off",()=>{
    expect(billingFeatureEnabled({})).toBe(false);
    expect(billingFeatureEnabled({STRIPE_BILLING_ENABLED:"false"})).toBe(false);
  });
  it("does not admit merely active but unpaid or mismatched subscription",()=>{
    expect(premiumAllowed([active],prices,now)).toBe(true);
    expect(premiumAllowed([{...active,paidThroughAt:null}],prices,now)).toBe(false);
    expect(premiumAllowed([{...active,stripePriceId:"price_attacker"}],prices,now)).toBe(false);
    expect(premiumAllowed([{...active,status:"past_due"}],prices,now)).toBe(false);
    expect(premiumAllowed([{...active,status:"canceled"}],prices,now)).toBe(false);
    expect(premiumAllowed([{...active,currentPeriodEnd:now}],prices,now)).toBe(false);
    expect(premiumAllowed([{...active,paidThroughAt:now}],prices,now)).toBe(false);
  });
  it("allows cancel-at-period-end only until paid term expires",()=>{
    expect(premiumAllowed([{...active,cancelAtPeriodEnd:true}],prices,now)).toBe(true);
    expect(premiumAllowed([{...active,cancelAtPeriodEnd:true}],prices,new Date("2027-01-01"))).toBe(false);
  });
  it("trial begins with first successful AI response, not signup",()=>{
    expect(trialAllowsNewChat(null,now)).toBe(true);
    expect(trialAllowsNewChat({trialStartedAt:null,trialEndsAt:null,successfulReplies:0},now)).toBe(true);
  });
  it("expires after 20 responses OR 72 hours, whichever first",()=>{
    expect(trialAllowsNewChat(trial,now)).toBe(true);
    expect(trialAllowsNewChat({...trial,successfulReplies:TRIAL_SUCCESSFUL_REPLY_LIMIT},now)).toBe(false);
    expect(trialAllowsNewChat(trial,new Date(prior.getTime()+72*60*60*1000))).toBe(false);
    expect(trialAllowsNewChat({...trial,trialEndsAt:null},now)).toBe(false);
    expect(paidOrTrial([],prices,{...trial,successfulReplies:20},now)).toBe("blocked");
  });
  it("premium overrides expired trial if subscription is paid and active",()=>{
    expect(paidOrTrial([active],prices,{...trial,successfulReplies:20},now)).toBe("premium");
  });
});
