import {and,eq,isNull} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {users} from "../drizzle/schema";
import {gamificationEvidence as evidence,gamificationPrivacy as privacy,gamificationShares as shares} from "../drizzle/gamification-draft";
import {prepareAchievementShare,type AchievementId} from "../shared/community-achievement-sharing";
import {GAMIFICATION_POLICY_VERSION,type XpAward} from "../shared/gamification-contract";
// Lab only. Caller must enforce authenticated owner, active membership and moderation.
export async function publishAchievement(db:MySql2Database,userId:number,achievementId:AchievementId,nowMs=Date.now()){
 return db.transaction(async tx=>{
  const [owner]=await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for("update");
  if(!owner)throw Error("Unknown owner");
  const [settings]=await tx.select().from(privacy).where(eq(privacy.userId,userId)).for("update");
  if(settings?.showAchievements!==true)throw Error("Sharing disabled");
  const rows=await tx.select().from(evidence).where(eq(evidence.userId,userId));
  const awards=rows.filter(r=>r.policyVersion===GAMIFICATION_POLICY_VERSION).map((r):XpAward=>({kind:r.kind,sourceId:r.sourceId,occurredAtMs:r.occurredAtMs,xp:r.awardedXp,policyVersion:GAMIFICATION_POLICY_VERSION}));
  const share=prepareAchievementShare(userId,achievementId,awards,nowMs);
  const [existing]=await tx.select().from(shares).where(and(eq(shares.userId,userId),eq(shares.achievementId,achievementId))).for("update");
  if(existing&&existing.revokedAtMs===null)return;
  await tx.insert(shares).values({userId,achievementId,publishedAtMs:share.publishedAtMs,revokedAtMs:null}).onDuplicateKeyUpdate({set:{publishedAtMs:share.publishedAtMs,revokedAtMs:null}});
 });
}
export async function revokeAchievement(db:MySql2Database,userId:number,achievementId:AchievementId,nowMs=Date.now()){
 if(!Number.isSafeInteger(userId)||userId<=0||!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid revocation");
 await db.transaction(async tx=>{
  await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for("update");
  await tx.update(shares).set({revokedAtMs:nowMs}).where(and(eq(shares.userId,userId),eq(shares.achievementId,achievementId),isNull(shares.revokedAtMs)));
 });
}
