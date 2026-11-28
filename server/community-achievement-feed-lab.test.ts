import {describe,it,expect} from "vitest";
import {achievementFeedPreview} from "./community-achievement-feed-lab";
import type {AchievementShare} from "../shared/community-achievement-sharing";
const share=(ownerId:number,publishedAtMs:number,revokedAtMs:number|null=null):AchievementShare=>({ownerId,achievementId:"first-lesson",publishedAtMs,revokedAtMs});
const allowed={viewerActive:true,ownerActive:true,ownerAllowsAchievements:true,moderationAllows:true};
describe("Achievement feed access",()=>{
 it("filters revoked and unauthorized entries before applying limit",async()=>{
  const result=await achievementFeedPreview(9,[share(1,5,6),share(2,4),share(3,3),share(4,2),share(4,2)],async(viewer,owner)=>{
   expect(viewer).toBe(9);
   return {...allowed,ownerActive:owner!==2,ownerAllowsAchievements:owner!==3};
  },1);
  expect(result.map(x=>x.ownerId)).toEqual([4]);
 });
 it("fails closed when access cannot be resolved",async()=>{
  await expect(achievementFeedPreview(9,[share(1,1)],async()=>{throw Error("Unavailable");})).rejects.toThrow("Unavailable");
 });
 it("hides all shares from inactive viewers",async()=>{
  expect(await achievementFeedPreview(9,[share(1,1)],async()=>({...allowed,viewerActive:false}))).toEqual([]);
 });
});
