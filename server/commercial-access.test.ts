import {describe,it,expect} from "vitest";
import {createCommercialAccess} from "./commercial-access";
import type {SubscriptionEvidence} from "../shared/commercial-entitlements";
describe("commercial access",()=>{
 it("checks both members and observes revocation",async()=>{
 const records:SubscriptionEvidence[]=[1,2].map(userId=>({userId,plan:"community-premium",status:"active",startsAtMs:0,endsAtMs:100}));
 const access=createCommercialAccess({listForOwner:async id=>records.filter(r=>r.userId===id)},()=>50);
 expect(await access.canViewCommunityProfile(1,2)).toBe(true);
 expect(await access.allows(1,"tutor")).toBe(false);
 records[1].status="cancelled";
 expect(await access.canViewCommunityProfile(1,2)).toBe(false);
 expect(await access.canViewCommunityProfile(2,1)).toBe(false);
 });
 it("denies unavailable repositories and invalid identities",async()=>{
 const access=createCommercialAccess({listForOwner:async()=>{throw Error("unavailable");}});
 expect(await access.isActiveMember(1)).toBe(false);
 expect(await access.isActiveMember(0)).toBe(false);
 });
});
