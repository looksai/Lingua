import {describe,it,expect} from "vitest";
import {reviewGamificationPreview} from "./gamification-review-evidence";
describe("Review XP preview",()=>{
 it("counts distinct valid server records without exposing source records",()=>{
  const record={logId:1,createdAt:new Date(0),text:"private"};
  const result=reviewGamificationPreview([record,record,{logId:0,createdAt:new Date(0)},{logId:2,createdAt:new Date(NaN)}]);
  expect(result.totalXp).toBe(10);
  expect(result.scope).toBe("review-history-preview");
  expect(JSON.stringify(result)).not.toContain("private");
  expect(result.achievements.find(a=>a.id==="fifty-reviews")?.progress).toBe(1);
 });
 it("does not claim lifetime XP",()=>{
  expect(reviewGamificationPreview([])).toMatchObject({scope:"review-history-preview",totalXp:0,level:1});
 });
});
