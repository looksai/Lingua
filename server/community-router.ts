import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { checkRequestOrigin, rateLimit } from "./auth-local";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { portalGroups, portalTopics, portalReplies, portalMembershipGrants,
  portalGroupModerators, portalPartners } from "../drizzle/schema";
import { canUsePortal, type PortalGrant, type PortalAccessInput } from "../shared/portal-access";

/**
 * Experimental forum API; disabled by default. No backfill/grants, no payments,
 * no partner lead exposure, no user content from learner memory.
 */
function enabled():boolean { return process.env.LINGUA_PORTAL_COMMUNITY_ENABLED==="true"; }
function requireEnabled(){
  if(!enabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Comunidade em preparação."});
}
async function database(){
  const db=await getDb();
  if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Comunidade temporariamente indisponível."});
  return db;
}
function forbidden():never { throw new TRPCError({code:"FORBIDDEN",message:"Acesso à comunidade não autorizado."}); }
const id=z.number().int().positive();
const text=z.string().trim().min(3);
async function grantsFor(userId:number,academyGroupAllowed:boolean):Promise<PortalAccessInput>{
  const db=await database();
  const rows=await db.select().from(portalMembershipGrants).where(eq(portalMembershipGrants.userId,userId));
  const grants:PortalGrant[]=rows.map(row=>({
    kind:row.kind,source:row.source,state:row.state,
    expiresAtMs:row.expiresAt?.getTime()??null,
  }));
  return {authenticated:true,nowMs:Date.now(),grants,academyGroupAllowed};
}

export const communityRouter=router({
  publicGroups:publicProcedure.query(async ()=>{
    if(!enabled())return [];
    const db=await database();
    return db.select({id:portalGroups.id,slug:portalGroups.slug,title:portalGroups.title,
      description:portalGroups.description}).from(portalGroups)
      .where(and(eq(portalGroups.visibility,"public"),eq(portalGroups.state,"active")))
      .orderBy(portalGroups.title).limit(40);
  }),
  publicTopics:publicProcedure.input(z.object({groupId:id})).query(async ({input})=>{
    if(!enabled())return [];
    const db=await database();
    const [group]=await db.select().from(portalGroups).where(and(
      eq(portalGroups.id,input.groupId),eq(portalGroups.visibility,"public"),eq(portalGroups.state,"active"))).limit(1);
    if(!group) return [];
    return db.select({id:portalTopics.id,title:portalTopics.title,body:portalTopics.body,
      createdAt:portalTopics.createdAt}).from(portalTopics)
      .where(and(eq(portalTopics.groupId,group.id),eq(portalTopics.state,"published")))
      .orderBy(desc(portalTopics.createdAt),desc(portalTopics.id)).limit(30);
  }),
  verifiedPartners:publicProcedure.query(async ()=>{
    if(!enabled())return [];
    const db=await database();
    return db.select({slug:portalPartners.slug,displayName:portalPartners.displayName,
      description:portalPartners.description}).from(portalPartners)
      .where(eq(portalPartners.verificationState,"verified"))
      .orderBy(portalPartners.displayName).limit(100);
  }),
  myGroups:protectedProcedure.query(async ({ctx})=>{
    requireEnabled();
    const db=await database();
    const rows=await db.select().from(portalGroups).where(eq(portalGroups.state,"active")).limit(100);
    const access=await grantsFor(ctx.user.id,false);
    const assigned=ctx.user.role==="admin" ? [] :
      await db.select({groupId:portalGroupModerators.groupId}).from(portalGroupModerators)
        .where(eq(portalGroupModerators.userId,ctx.user.id));
    const moderateIds=new Set(assigned.map(record=>record.groupId));
    return rows.filter(group=>ctx.user.role==="admin" || group.visibility==="public" ||
      canUsePortal({...access,academyGroupAllowed:group.academyAllowed===1},"read-private"))
      .map(group=>({
        id:group.id,title:group.title,slug:group.slug,
        description:group.description,visibility:group.visibility,
        canCreate:canUsePortal(access,"create-private-topic"),
        canReply:canUsePortal({...access,academyGroupAllowed:group.academyAllowed===1},"reply-in-private"),
        canModerate:ctx.user.role==="admin" ||
          (moderateIds.has(group.id)&&canUsePortal({...access,communityRole:"moderator"},"manage-group")),
      }));
  }),
  groupTopics:protectedProcedure.input(z.object({groupId:id})).query(async ({ctx,input})=>{
    requireEnabled();
    const db=await database();
    const [group]=await db.select().from(portalGroups).where(and(
      eq(portalGroups.id,input.groupId),eq(portalGroups.state,"active"))).limit(1);
    if(!group)throw new TRPCError({code:"NOT_FOUND",message:"Grupo indisponível."});
    if(group.visibility==="private"&&ctx.user.role!=="admin"&&!canUsePortal(await grantsFor(ctx.user.id,group.academyAllowed===1),"read-private"))
      forbidden();
    return db.select({id:portalTopics.id,title:portalTopics.title,body:portalTopics.body,
      createdAt:portalTopics.createdAt}).from(portalTopics)
      .where(and(eq(portalTopics.groupId,group.id),eq(portalTopics.state,"published")))
      .orderBy(desc(portalTopics.createdAt),desc(portalTopics.id)).limit(30);
  }),
  createTopic:protectedProcedure.input(z.object({
    groupId:id,title:text.max(160),body:text.max(5000),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    rateLimit("forum-topic:"+ctx.user.id);
    const db=await database();
    const [group]=await db.select().from(portalGroups)
      .where(and(eq(portalGroups.id,input.groupId),eq(portalGroups.state,"active"))).limit(1);
    if(!group)throw new TRPCError({code:"NOT_FOUND",message:"Grupo indisponível."});
    const grants=await grantsFor(ctx.user.id,group.academyAllowed===1);
    if(!canUsePortal(grants,"create-private-topic"))forbidden();
    await db.insert(portalTopics).values({groupId:group.id,authorUserId:ctx.user.id,
      title:input.title,body:input.body,state:"pending"});
    return {queuedForModeration:true as const};
  }),
  createReply:protectedProcedure.input(z.object({topicId:id,body:text.max(3000)})).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    rateLimit("forum-reply:"+ctx.user.id);
    const db=await database();
    const [topic]=await db.select().from(portalTopics)
      .where(and(eq(portalTopics.id,input.topicId),eq(portalTopics.state,"published"))).limit(1);
    if(!topic)throw new TRPCError({code:"NOT_FOUND",message:"Discussão indisponível."});
    const [group]=await db.select().from(portalGroups)
      .where(and(eq(portalGroups.id,topic.groupId),eq(portalGroups.state,"active"))).limit(1);
    if(!group)throw new TRPCError({code:"NOT_FOUND",message:"Grupo indisponível."});
    if(!canUsePortal(await grantsFor(ctx.user.id,group.academyAllowed===1),"reply-in-private"))forbidden();
    await db.insert(portalReplies).values({topicId:topic.id,authorUserId:ctx.user.id,
      body:input.body,state:"pending"});
    return {queuedForModeration:true as const};
  }),
  topicReplies:protectedProcedure.input(z.object({topicId:id})).query(async ({ctx,input})=>{
    requireEnabled();
    const db=await database();
    const [topic]=await db.select().from(portalTopics).where(and(
      eq(portalTopics.id,input.topicId),eq(portalTopics.state,"published"))).limit(1);
    if(!topic)throw new TRPCError({code:"NOT_FOUND",message:"Discussão indisponível."});
    const [group]=await db.select().from(portalGroups).where(and(
      eq(portalGroups.id,topic.groupId),eq(portalGroups.state,"active"))).limit(1);
    if(!group)throw new TRPCError({code:"NOT_FOUND",message:"Grupo indisponível."});
    if(group.visibility==="private"&&ctx.user.role!=="admin"&&!canUsePortal(await grantsFor(ctx.user.id,group.academyAllowed===1),"read-private"))
      forbidden();
    return db.select({id:portalReplies.id,body:portalReplies.body,createdAt:portalReplies.createdAt})
      .from(portalReplies).where(and(eq(portalReplies.topicId,topic.id),eq(portalReplies.state,"published")))
      .orderBy(portalReplies.createdAt,portalReplies.id).limit(80);
  }),
  moderationQueue:protectedProcedure.input(z.object({groupId:id})).query(async ({ctx,input})=>{
    requireEnabled();
    const db=await database();
    const [group]=await db.select().from(portalGroups).where(and(
      eq(portalGroups.id,input.groupId),eq(portalGroups.state,"active"))).limit(1);
    if(!group)throw new TRPCError({code:"NOT_FOUND",message:"Grupo indisponível."});
    if(ctx.user.role!=="admin"){
      const [assignment]=await db.select().from(portalGroupModerators).where(and(
        eq(portalGroupModerators.userId,ctx.user.id),
        eq(portalGroupModerators.groupId,group.id))).limit(1);
      if(!assignment || !canUsePortal({...await grantsFor(ctx.user.id,false),communityRole:"moderator"},"manage-group"))forbidden();
    }
    const pendingTopics=await db.select({id:portalTopics.id,title:portalTopics.title,body:portalTopics.body})
      .from(portalTopics).where(and(eq(portalTopics.groupId,group.id),eq(portalTopics.state,"pending")))
      .orderBy(desc(portalTopics.createdAt),desc(portalTopics.id)).limit(40);
    const pendingReplies=await db.select({id:portalReplies.id,topicId:portalReplies.topicId,body:portalReplies.body})
      .from(portalReplies).innerJoin(portalTopics,eq(portalReplies.topicId,portalTopics.id))
      .where(and(eq(portalTopics.groupId,group.id),eq(portalReplies.state,"pending")))
      .orderBy(desc(portalReplies.createdAt),desc(portalReplies.id)).limit(40);
    return {pendingTopics,pendingReplies};
  }),
  moderateTopic:protectedProcedure.input(z.object({
    topicId:id,state:z.enum(["published","hidden"]),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    const db=await database();
    const [topic]=await db.select().from(portalTopics).where(eq(portalTopics.id,input.topicId)).limit(1);
    if(!topic)throw new TRPCError({code:"NOT_FOUND",message:"Discussão indisponível."});
    if(ctx.user.role!=="admin"){
      const [m]=await db.select().from(portalGroupModerators).where(and(
        eq(portalGroupModerators.groupId,topic.groupId),
        eq(portalGroupModerators.userId,ctx.user.id))).limit(1);
      if(!m || !canUsePortal({...await grantsFor(ctx.user.id,false),communityRole:"moderator"},"manage-group"))forbidden();
    }
    await db.update(portalTopics).set({state:input.state}).where(eq(portalTopics.id,topic.id));
    return {updated:true as const};
  }),
  moderateReply:protectedProcedure.input(z.object({
    replyId:id,state:z.enum(["published","hidden"]),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    const db=await database();
    const [reply]=await db.select().from(portalReplies).where(eq(portalReplies.id,input.replyId)).limit(1);
    if(!reply)throw new TRPCError({code:"NOT_FOUND",message:"Comentário indisponível."});
    const [topic]=await db.select().from(portalTopics).where(eq(portalTopics.id,reply.topicId)).limit(1);
    if(!topic)throw new TRPCError({code:"NOT_FOUND",message:"Discussão indisponível."});
    if(ctx.user.role!=="admin"){
      const [m]=await db.select().from(portalGroupModerators).where(and(
        eq(portalGroupModerators.groupId,topic.groupId),
        eq(portalGroupModerators.userId,ctx.user.id))).limit(1);
      if(!m || !canUsePortal({...await grantsFor(ctx.user.id,false),communityRole:"moderator"},"manage-group"))forbidden();
    }
    await db.update(portalReplies).set({state:input.state}).where(eq(portalReplies.id,reply.id));
    return {updated:true as const};
  }),
});
