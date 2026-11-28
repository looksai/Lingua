import {communityInteractionAllowed} from "./community-safety-lab";
import {communityBlocks as blocks,communityRestrictions as restrictions} from "../drizzle/community-safety-draft";
import {and,desc,eq,exists,gt,gte,inArray,isNull,lt,lte,notExists,or} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationShares as shares,gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {commercialSubscriptions as subscriptions} from "../drizzle/commercial-draft";
import {commercialAccessLab} from "./commercial-repository-lab";
import {achievementFeedPreview} from "./community-achievement-feed-lab";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
import type {AchievementShare} from "../shared/community-achievement-sharing";
// Bounded recent feed, not a complete history. No public route.
export async function readCommunityAchievementFeed(db:MySql2Database,viewerId:number,moderationAllows:(viewerId:number,ownerId:number,achievementId:string)=>Promise<boolean>,limit=20,before?:{publishedAtMs:number;id:number}){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid limit");
 if(before&&(!Number.isSafeInteger(before.publishedAtMs)||before.publishedAtMs<0||!Number.isSafeInteger(before.id)||before.id<=0||before.id>2147483647))throw Error("Invalid cursor");
 const access=commercialAccessLab(db);
 if(!await access.isActiveMember(viewerId)||!await communityInteractionAllowed(db,viewerId,viewerId))throw Error("Community access required");
 // Remove hidden pairs before keyset pagination so their IDs cannot become cursors.
 const noBlock=notExists(db.select({id:blocks.ownerId}).from(blocks).where(or(
   and(eq(blocks.ownerId,viewerId),eq(blocks.targetId,shares.userId)),
   and(eq(blocks.targetId,viewerId),eq(blocks.ownerId,shares.userId)),
 )));
 const noSuspension=notExists(db.select({id:restrictions.userId}).from(restrictions)
   .where(and(eq(restrictions.userId,shares.userId),eq(restrictions.suspended,true))));
 const now=Date.now();
 const activeAuthor=exists(db.select({id:subscriptions.id}).from(subscriptions).where(and(
   eq(subscriptions.userId,shares.userId),eq(subscriptions.status,"active"),
   inArray(subscriptions.plan,["lingua-premium","community-premium"]),
   gte(subscriptions.startsAtMs,0),lte(subscriptions.startsAtMs,now),gt(subscriptions.endsAtMs,now),
 )));
 const rows=await db.select().from(shares).innerJoin(privacy,and(eq(privacy.userId,shares.userId),eq(privacy.showAchievements,true))).where(and(noBlock,noSuspension,activeAuthor,isNull(shares.revokedAtMs),before?or(lt(shares.publishedAtMs,before.publishedAtMs),and(eq(shares.publishedAtMs,before.publishedAtMs),lt(shares.id,before.id))):undefined)).orderBy(desc(shares.publishedAtMs),desc(shares.id)).limit(limit+1);
 const candidates:AchievementShare[]=[];
 for(const {gamificationShares:r} of rows.slice(0,limit)){
 const achievement=ACHIEVEMENTS.find(a=>a.id===r.achievementId);
 if(achievement)candidates.push({ownerId:r.userId,achievementId:achievement.id,publishedAtMs:r.publishedAtMs,revokedAtMs:r.revokedAtMs});
 }
 const result=await achievementFeedPreview(viewerId,candidates,async(viewer,owner,achievementId)=>{
 const viewerActive=await access.isActiveMember(viewer);
 const ownerActive=await access.isActiveMember(owner);
 const moderation=viewerActive&&ownerActive&&await communityInteractionAllowed(db,viewer,owner)&&await moderationAllows(viewer,owner,achievementId);
 const original=candidates.find(c=>c.ownerId===owner&&c.achievementId===achievementId);
 const [current]=await db.select({allowed:privacy.showAchievements,publishedAtMs:shares.publishedAtMs}).from(privacy).innerJoin(shares,and(eq(shares.userId,privacy.userId),eq(shares.achievementId,achievementId),isNull(shares.revokedAtMs))).where(eq(privacy.userId,owner)).limit(1);
 return {viewerActive,ownerActive,ownerAllowsAchievements:current?.allowed===true&&current.publishedAtMs===original?.publishedAtMs,moderationAllows:moderation};
 },limit);
 if(!await access.isActiveMember(viewerId)||!await communityInteractionAllowed(db,viewerId,viewerId))throw Error("Community access required");
 const last=rows[Math.min(rows.length,limit)-1]?.gamificationShares;
 return {items:result,nextCursor:rows.length>limit&&last?{publishedAtMs:last.publishedAtMs,id:last.id}:null};
}
