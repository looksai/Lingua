import {xpProgress,type XpAward} from "./gamification-contract";
import {achievementProgress} from "./gamification-achievements";
export type GamificationPrivacy={showLevel:boolean;showAchievements:boolean;leaderboardOptIn:boolean};
export const PRIVATE_GAMIFICATION:Readonly<GamificationPrivacy>=Object.freeze({showLevel:false,showAchievements:false,leaderboardOptIn:false});
export function personalGamificationProfile(entries:readonly XpAward[]){
 const unique=new Map<string,XpAward>();
 for(const entry of entries)if(entry.xp>0){
  const key=JSON.stringify([entry.kind,entry.sourceId]);
  if(!unique.has(key))unique.set(key,entry);
 }
 const awards=[...unique.values()];
 return {...xpProgress(awards),achievements:achievementProgress(awards)};
}
// Caller must independently verify active community membership and viewer access.
export function communityGamificationProfile(entries:readonly XpAward[],privacy:GamificationPrivacy=PRIVATE_GAMIFICATION){
 const profile=personalGamificationProfile(entries);
 return {
 ...(privacy.showLevel===true?{level:profile.level}:{}),
 ...(privacy.showAchievements===true?{achievements:profile.achievements.filter(a=>a.unlocked).map(({id,title})=>({id,title}))}:{}),
 };
}
