import {and,eq,isNull} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {communityPublicationReports as reports,communityPublicationRestrictions as restrictions} from "../drizzle/community-safety-draft";
import {gamificationShares as shares,gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {users} from "../drizzle/schema";
import {commercialAccessLab} from "./commercial-repository-lab";
import {communityInteractionAllowed} from "./community-safety-lab";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
type Reason="spam"|"harassment"|"inappropriate"|"other";
// Laboratory only; caller supplies authenticated reporter, never client identity.
export async function reportCommunityPublication(db:MySql2Database,reporterId:number,input:{ownerId:number;achievementId:string;publishedAtMs:number;reason:Reason}){
 const {ownerId,achievementId,publishedAtMs,reason}=input;
 if(![reporterId,ownerId].every(id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647)||reporterId===ownerId||!Number.isSafeInteger(publishedAtMs)||publishedAtMs<0||!ACHIEVEMENTS.some(a=>a.id===achievementId)||!["spam","harassment","inappropriate","other"].includes(reason))throw Error("Invalid report");
 const access=commercialAccessLab(db);
 if(!await access.canViewCommunityProfile(reporterId,ownerId)||!await communityInteractionAllowed(db,reporterId,ownerId))throw Error("Publication unavailable");
 await db.transaction(async tx=>{
  await tx.select({id:users.id}).from(users).where(eq(users.id,ownerId)).for("update");
  const [share]=await tx.select({id:shares.id}).from(shares).innerJoin(privacy,and(eq(privacy.userId,shares.userId),eq(privacy.showAchievements,true))).where(and(eq(shares.userId,ownerId),eq(shares.achievementId,achievementId),eq(shares.publishedAtMs,publishedAtMs),isNull(shares.revokedAtMs))).for("update");
  const [restriction]=await tx.select().from(restrictions).where(and(eq(restrictions.ownerId,ownerId),eq(restrictions.achievementId,achievementId))).for("update");
  if(!share||restriction?.hidden)throw Error("Publication unavailable");
  await tx.insert(reports).values({reporterId,ownerId,achievementId,publishedAtMs,reason,createdAtMs:Date.now()}).onDuplicateKeyUpdate({set:{reporterId}});
 });
 return {processed:true as const};
}
