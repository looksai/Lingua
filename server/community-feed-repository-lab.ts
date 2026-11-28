import {and,desc,eq,isNull,lt,or} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationShares as shares,gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {commercialAccessLab} from "./commercial-repository-lab";
import {achievementFeedPreview} from "./community-achievement-feed-lab";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
import type {AchievementShare} from "../shared/community-achievement-sharing";
// Bounded recent feed, not a complete history. No public route.
export async function readCommunityAchievementFeed(db:MySql2Database,viewerId:number,moderationAllows:(viewerId:number,ownerId:number,achievementId:string)=>Promise<boolean>,limit=20,before?:{publishedAtMs:number;id:number}){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid limit");
 if(before&&(!Number.isSafeInteger(before.publishedAtMs)||before.publishedAtMs<0||!Number.isSafeInteger(before.id)||before.id<=0||before.id>2147483647))throw Error("Invalid cursor");
 const access=commercialAccessLab(db);
 if(!await access.isActiveMember(viewerId))throw Error("Community access required");
 const rows=await db.select().from(shares).innerJoin(privacy,and(eq(privacy.userId,shares.userId),eq(privacy.showAchievements,true))).where(and(isNull(shares.revokedAtMs),before?or(lt(shares.publishedAtMs,before.publishedAtMs),and(eq(shares.publishedAtMs,before.publishedAtMs),lt(shares.id,before.id))):undefined)).orderBy(desc(shares.publishedAtMs),desc(shares.id)).limit(limit+1);
 const candidates:AchievementShare[]=[];
 for(const {gamificationShares:r} of rows.slice(0,limit)){
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
 const last=rows[Math.min(rows.length,limit)-1]?.gamificationShares;
 return {items:result,nextCursor:rows.length>limit&&last?{publishedAtMs:last.publishedAtMs,id:last.id}:null};
}
