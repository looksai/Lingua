import {and,eq,inArray,or} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationShares} from "../drizzle/gamification-draft";
import {ACHIEVEMENTS} from "../shared/gamification-achievements";
import {users} from "../drizzle/schema";
import {communityBlocks,communityModerationAudit,communityRestrictions,communityPublicationRestrictions,communityPublicationAudit} from "../drizzle/community-safety-draft";

function checkMember(id:number){
  if(!Number.isSafeInteger(id)||id<=0||id>2147483647)throw Error("Invalid member");
}

// Direction belongs to the member who created the block. Visibility is mutual.
export async function setCommunityBlock(db:MySql2Database,owner:number,target:number,blocked:boolean){
  checkMember(owner);checkMember(target);
  if(owner===target)throw Error("Cannot block own account");
  await db.transaction(async tx=>{
    // Lock the pair in canonical order. A concurrent report or block must
    // observe either the state before this transition or the state after it.
    for(const id of [owner,target].sort((a,b)=>a-b)){
      const [row]=await tx.select({id:users.id}).from(users).where(eq(users.id,id)).for("update");
      if(!row)throw Error("Unknown member");
    }
    if(blocked){
      await tx.insert(communityBlocks).values({ownerId:owner,targetId:target}).onDuplicateKeyUpdate({set:{targetId:target}});
    }else{
      await tx.delete(communityBlocks).where(and(eq(communityBlocks.ownerId,owner),eq(communityBlocks.targetId,target)));
    }
  });
}

export async function communityInteractionAllowed(db:MySql2Database,viewer:number,owner:number){
  checkMember(viewer);checkMember(owner);
  const [restriction]=await db.select({id:communityRestrictions.userId}).from(communityRestrictions)
    .where(and(inArray(communityRestrictions.userId,[viewer,owner]),eq(communityRestrictions.suspended,true))).limit(1);
  if(restriction)return false;
  if(viewer===owner)return true;
  const [block]=await db.select({id:communityBlocks.ownerId}).from(communityBlocks).where(or(
    and(eq(communityBlocks.ownerId,viewer),eq(communityBlocks.targetId,owner)),
    and(eq(communityBlocks.ownerId,owner),eq(communityBlocks.targetId,viewer)),
  )).limit(1);
  return !block;
}

export async function setCommunityRestriction(db:MySql2Database,actor:number,target:number,suspended:boolean){
  checkMember(actor);checkMember(target);
  await db.transaction(async tx=>{
    const [owner]=await tx.select({id:users.id}).from(users).where(eq(users.id,target)).for("update");
    if(!owner)throw Error("Unknown member");
    const [current]=await tx.select().from(communityRestrictions).where(eq(communityRestrictions.userId,target)).for("update");
    if((current?.suspended??false)===suspended)return;
    await tx.insert(communityRestrictions).values({userId:target,suspended}).onDuplicateKeyUpdate({set:{suspended}});
    await tx.insert(communityModerationAudit).values({actorId:actor,targetId:target,suspended,occurredAtMs:Date.now()});
  });
}

 // Trusted administrative caller only. Serialize against publish/revoke using the owner lock.
export async function setCommunityPublicationRestriction(db:MySql2Database,actor:number,owner:number,achievementId:string,hidden:boolean){
 checkMember(actor);checkMember(owner);
 if(!ACHIEVEMENTS.some(a=>a.id===achievementId))throw Error("Unknown achievement");
 await db.transaction(async tx=>{
  const [member]=await tx.select({id:users.id}).from(users).where(eq(users.id,owner)).for("update");
  if(!member)throw Error("Unknown member");
  const [share]=await tx.select({id:gamificationShares.id}).from(gamificationShares).where(and(eq(gamificationShares.userId,owner),eq(gamificationShares.achievementId,achievementId))).for("update");
  if(!share)throw Error("Unknown publication");
  const [current]=await tx.select().from(communityPublicationRestrictions).where(and(eq(communityPublicationRestrictions.ownerId,owner),eq(communityPublicationRestrictions.achievementId,achievementId))).for("update");
  if((current?.hidden??false)===hidden)return;
  await tx.insert(communityPublicationRestrictions).values({ownerId:owner,achievementId,hidden}).onDuplicateKeyUpdate({set:{hidden}});
  await tx.insert(communityPublicationAudit).values({actorId:actor,ownerId:owner,achievementId,hidden,occurredAtMs:Date.now()});
 });
}
