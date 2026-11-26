import {describe,expect,it} from "vitest";
import {evaluateCommunityAccess,type CommunityEntitlement} from "./community-access";

const nowMs=1700000000000;
const entitlement:CommunityEntitlement={userId:42,status:"active",validUntilMs:nowMs+60_000};
const base={featureEnabled:true,authenticatedUserId:42,entitlement,nowMs};

describe("community membership boundary",()=>{
  it("allows an authenticated owner of a currently active entitlement",()=>{
    expect(evaluateCommunityAccess(base)).toEqual({allowed:true});
  });
  it("fails closed when feature disabled",()=>{
    expect(evaluateCommunityAccess({...base,featureEnabled:false})).toEqual({allowed:false,reason:"disabled"});
  });
  it.each([null,0,-1,1.5,NaN])("denies invalid identity %s",authenticatedUserId=>{
    expect(evaluateCommunityAccess({...base,authenticatedUserId})).toEqual({allowed:false,reason:"authentication_required"});
  });
  it("denies an entitlement belonging to another account",()=>{
    expect(evaluateCommunityAccess({...base,authenticatedUserId:43})).toEqual({allowed:false,reason:"subscription_required"});
  });
  it("denies absent entitlement",()=>{
    expect(evaluateCommunityAccess({...base,entitlement:null})).toEqual({allowed:false,reason:"subscription_required"});
  });
  it.each(["trialing","past_due","paused","canceled","unpaid"] as const)("denies inactive status %s",status=>{
    expect(evaluateCommunityAccess({...base,entitlement:{...entitlement,status}})).toEqual({allowed:false,reason:"subscription_required"});
  });
  it.each([nowMs,nowMs-1,NaN,Infinity])("denies expired or invalid validity %s",validUntilMs=>{
    expect(evaluateCommunityAccess({...base,entitlement:{...entitlement,validUntilMs}})).toEqual({allowed:false,reason:"subscription_required"});
  });
  it.each([NaN,Infinity,-1,1.5])("denies invalid clock %s",invalidNow=>{
    expect(evaluateCommunityAccess({...base,nowMs:invalidNow})).toEqual({allowed:false,reason:"subscription_required"});
  });
});
