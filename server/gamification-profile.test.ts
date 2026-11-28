import {describe,it,expect} from "vitest";
import {projectXp} from "../shared/gamification-contract";
import {personalGamificationProfile,communityGamificationProfile,PRIVATE_GAMIFICATION} from "../shared/gamification-profile";
const awards=projectXp([{kind:"lesson_completed",sourceId:"private-source",occurredAtMs:0}]);
describe("Gamification profile privacy",()=>{
 it("keeps community profile private by default",()=>{
  expect(communityGamificationProfile(awards)).toEqual({});
  expect(communityGamificationProfile(awards,{...PRIVATE_GAMIFICATION,leaderboardOptIn:true})).toEqual({});
 });
 it("shares only opted-in fields and unlocked achievement titles",()=>{
  expect(communityGamificationProfile(awards,{...PRIVATE_GAMIFICATION,showLevel:true})).toEqual({level:1});
  expect(communityGamificationProfile(awards,{...PRIVATE_GAMIFICATION,showAchievements:true})).toEqual({achievements:[{id:"first-lesson",title:"Primeiro passo"}]});
 });
 it("excludes zero awards and duplicate receipts from personal progress",()=>{
  const profile=personalGamificationProfile([...awards,...awards,{...awards[0]!,sourceId:"zero",xp:0}]);
  expect(profile.totalXp).toBe(20);
  expect(profile.achievements.find(a=>a.id==="hundred-lessons")?.progress).toBe(1);
  expect(JSON.stringify(profile)).not.toContain("private-source");
 });
});
