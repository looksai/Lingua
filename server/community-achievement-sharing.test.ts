import {describe,it,expect} from "vitest";
import {prepareAchievementShare,visibleAchievementShare} from "../shared/community-achievement-sharing";
import {projectXp} from "../shared/gamification-contract";
const awards=projectXp([{kind:"lesson_completed",sourceId:"private-evidence",occurredAtMs:1}]);
const access={viewerActive:true,ownerActive:true,ownerAllowsAchievements:true,moderationAllows:true};
describe("Achievement sharing",()=>{
 it("requires an unlocked achievement",()=>{
  expect(()=>prepareAchievementShare(1,"hundred-lessons",awards,2)).toThrow();
  expect(()=>prepareAchievementShare(1,"first-lesson",[],2)).toThrow();
 });
 it("returns only public achievement metadata",()=>{
  const share=prepareAchievementShare(1,"first-lesson",awards,2);
  expect(visibleAchievementShare(share,access)).toEqual({ownerId:1,achievementId:"first-lesson",title:"Primeiro passo",publishedAtMs:2});
 });
 it("denies every missing access condition and revoked shares",()=>{
  const share=prepareAchievementShare(1,"first-lesson",awards,2);
  for(const key of Object.keys(access) as (keyof typeof access)[])expect(visibleAchievementShare(share,{...access,[key]:false})).toBeNull();
  expect(visibleAchievementShare({...share,revokedAtMs:3},access)).toBeNull();
 });
});
