import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialAccessLab} from "./commercial-repository-lab";
import {readWeeklyCommunityRanking} from "./community-leaderboard-lab";
import {readCommunityGamificationProfile} from "./community-gamification-profile-lab";
// Laboratory facade: owner and viewer IDs must come from authenticated server context.
// Moderation and blocking policy must be supplied by the community repository.
export function communityCommercialLab(db:MySql2Database,canInteract:(viewerId:number,ownerId:number)=>Promise<boolean>){
 const access=commercialAccessLab(db);
 async function canView(viewerId:number,ownerId:number){
  try{return await access.canViewCommunityProfile(viewerId,ownerId)&&await canInteract(viewerId,ownerId);}catch{return false;}
 }
 return {
  profile:(viewerId:number,ownerId:number)=>readCommunityGamificationProfile(db,viewerId,ownerId,canView),
  ranking:(viewerId:number,nowMs=Date.now(),limit=20)=>readWeeklyCommunityRanking(db,viewerId,id=>canView(viewerId,id),nowMs,limit),
 };
}
