import {describe,expect,it} from "vitest";
import {academyTrialStatus,trialGatedPath,TRIAL_DAYS} from "./academy-trial";
const start=1700000000000, day=86400000, createdAt=new Date(start);
const enabled={ACADEMY_TRIAL_ENABLED:"true"};
describe("Academy 15-day trial",()=>{
  it("uses registration timestamp rather than first login",()=>{
    expect(TRIAL_DAYS).toBe(15);
    expect(academyTrialStatus(createdAt,enabled,start)).toEqual({kind:"active",expiresAtMs:start+15*day,remainingDays:15});
    expect(academyTrialStatus(createdAt,enabled,start+14*day+1)).toMatchObject({kind:"active",remainingDays:1});
  });
  it("expires at the exact server deadline without renewal on login",()=>{
    expect(academyTrialStatus(createdAt,enabled,start+15*day-1)).toMatchObject({kind:"active",remainingDays:1});
    expect(academyTrialStatus(createdAt,enabled,start+15*day)).toMatchObject({kind:"expired",remainingDays:0});
    expect(academyTrialStatus(createdAt,enabled,start+60*day)).toMatchObject({kind:"expired",remainingDays:0});
  });
  it("preserves staging when rollout is disabled and fails closed on malformed configuration or dates",()=>{
    expect(academyTrialStatus(createdAt,{},start+100*day)).toEqual({kind:"disabled"});
    expect(academyTrialStatus(createdAt,{ACADEMY_TRIAL_ENABLED:"false"},start)).toEqual({kind:"disabled"});
    expect(academyTrialStatus(createdAt,{ACADEMY_TRIAL_ENABLED:"yes"},start)).toEqual({kind:"unavailable"});
    expect(academyTrialStatus(undefined,enabled,start)).toEqual({kind:"unavailable"});
    expect(academyTrialStatus(new Date(NaN),enabled,start)).toEqual({kind:"unavailable"});
    expect(academyTrialStatus(createdAt,enabled,start-1)).toEqual({kind:"unavailable"});
  });
  it.each(["onboarding.me","learning.review","placement.generate","speech.transcribe","tutor.reply","tutor.neuralEnglish","tutor.memorySave"])("gates %s",path=>expect(trialGatedPath(path)).toBe(true));
  it.each(["auth.me","auth.trialStatus","auth.signIn","partnerEvents.mine","tutor.memoryDelete","tutor.memoryList","tutor.memoryClear","tutor.revokeCatalogConsent","placement.clear","learning.removeItem"])("preserves %s",path=>expect(trialGatedPath(path)).toBe(false));
});
