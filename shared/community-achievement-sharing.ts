import {ACHIEVEMENTS,achievementProgress} from "./gamification-achievements";
import type {XpAward} from "./gamification-contract";
export type AchievementId=typeof ACHIEVEMENTS[number]["id"];
export type AchievementShare={ownerId:number;achievementId:AchievementId;publishedAtMs:number;revokedAtMs:number|null};
// Trusted server awards only. Membership and current privacy must be verified by caller.
export function prepareAchievementShare(ownerId:number,achievementId:AchievementId,awards:readonly XpAward[],nowMs:number):AchievementShare{
 if(!Number.isSafeInteger(ownerId)||ownerId<=0||!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid share");
 if(!achievementProgress(awards.filter(a=>a.xp>0)).some(a=>a.id===achievementId&&a.unlocked))throw Error("Achievement not unlocked");
 return {ownerId,achievementId,publishedAtMs:nowMs,revokedAtMs:null};
}
export function visibleAchievementShare(share:AchievementShare,access:{viewerActive:boolean;ownerActive:boolean;ownerAllowsAchievements:boolean;moderationAllows:boolean}){
 if(!access.viewerActive||!access.ownerActive||!access.ownerAllowsAchievements||!access.moderationAllows||share.revokedAtMs!==null)return null;
 const achievement=ACHIEVEMENTS.find(a=>a.id===share.achievementId);
 return achievement?{ownerId:share.ownerId,achievementId:achievement.id,title:achievement.title,publishedAtMs:share.publishedAtMs}:null;
}
