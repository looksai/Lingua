import {and,desc,eq,isNull} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationShares as shares,gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {commercialAccessLab} from "./commercial-repository-lab";
import {achievementFeedPreview} from "./community-achievement-feed-lab";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
import type {AchievementShare} from "../shared/community-achievement-sharing";
// Bounded recent feed, not a complete history. No public route.
export async function readCommunityAchievementFeed(db:MySql2Database,viewerId:number,moderationAllows:(viewerId:number,ownerId:number,achievementId:string)=>Promise<boolean>,limit=20){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid limit");
 const access=commercialAccessLab(db);
 if(!await access.isActiveMember(viewerId))throw Error("Community access required");
 const rows=await db.select().from(shares).innerJoin(privacy,and(eq(privacy.userId,shares.userId),eq(privacy.showAchievements,true))).where(isNull(shares.revokedAtMs)).orderBy(desc(shares.publishedAtMs),desc(shares.id)).limit(500);
 const candidates:AchievementShare[]=[];
 for(const {gamificationShares:r} of rows){
 const achievement=ACHIEVEMENTS.find(a=>a.id===r.achievementId);
 if(achievement)candidates.push({ownerId:r.userId,achievementId:achievement.id,publishedAtMs:r.publishedAtMs,revokedAtMs:r.revokedAtMs});
 }
 const result=await achievementFeedPreview(viewerId,candidates,async(viewer,owner,achievementId)=>{
 const viewerActive=await access.isActiveMember(viewer);
 const ownerActive=await access.isActiveMember(owner);
 const moderation=viewerActive&&ownerActive&&await moderationAllows(viewer,owner,achievementId);
 const [current]=await db.select({allowed:privacy.showAchievements}).from(privacy).innerJoin(shares,and(eq(shares.userId,privacy.userId),eq(shares.achievementId,achievementId),isNull(shares.revokedAtMs))).where(eq(privacy.userId,owner)).limit(1);
 return {viewerActive,ownerActive,ownerAllowsAchievements:current?.allowed===true,moderationAllows:moderation};
 },limit);
 if(!await access.isActiveMember(viewerId))throw Error("Community access required");
 return result;
}
