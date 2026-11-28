import {describe,it,expect} from "vitest";
import {commercialBenefits,type SubscriptionEvidence} from "../shared/commercial-entitlements";
const active:SubscriptionEvidence={userId:1,plan:"lingua-premium",status:"active",startsAtMs:10,endsAtMs:100};
describe("Commercial entitlements",()=>{
 it("separates course and community plans",()=>{
  expect(commercialBenefits(1,[active],50)).toContain("tutor");
  expect(commercialBenefits(1,[{...active,plan:"community-premium"}],50)).toEqual(["exams","community","social-achievements","leaderboard"]);
 });
 it("denies other owners, expiry, future starts and inactive status",()=>{
  expect(commercialBenefits(2,[active],50)).toEqual([]);
  expect(commercialBenefits(1,[active],100)).toEqual([]);
  expect(commercialBenefits(1,[active],9)).toEqual([]);
  for(const status of ["cancelled","expired","pending","suspended"] as const)expect(commercialBenefits(1,[{...active,status}],50)).toEqual([]);
 });
});
