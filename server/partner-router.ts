import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { checkRequestOrigin, rateLimit } from "./auth-local";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { portalMembershipGrants, portalPartners, portalPartnerStaff, portalPartnerInquiries, portalInquiryMessages } from "../drizzle/schema";
import { hasPortalGrant, type PortalGrant, type PortalAccessInput } from "../shared/portal-access";

/**
 * Opt-in business inquiries and institution editing. All endpoints fail closed
 * unless both rollout flags are enabled; no email or learner history exposed.
 * Staff are provisioned by approved, separate administrative operations.
 */
function enabled(){
  return process.env.LINGUA_PORTAL_COMMUNITY_ENABLED==="true" &&
    process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED==="true";
}
function requireEnabled(){
  if(!enabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Atendimento institucional em preparação."});
}
function forbidden():never{
  throw new TRPCError({code:"FORBIDDEN",message:"Você não tem permissão para esta operação."});
}
async function database(){
  const db=await getDb();
  if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Atendimento temporariamente indisponível."});
  return db;
}
const id=z.number().int().positive();
const slug=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
async function validMember(userId:number){
  const db=await database();
  const rows=await db.select().from(portalMembershipGrants).where(eq(portalMembershipGrants.userId,userId));
  const access:PortalAccessInput={
    authenticated:true,nowMs:Date.now(),
    grants:rows.map(row=>({
      kind:row.kind,state:row.state,source:row.source,expiresAtMs:row.expiresAt?.getTime()??null,
    } satisfies PortalGrant)),
  };
  return hasPortalGrant(access,"club")||hasPortalGrant(access,"academy");
}
async function staffFor(userId:number,partnerId:number){
  const db=await database();
  const [staff]=await db.select({role:portalPartnerStaff.role}).from(portalPartnerStaff).where(and(
    eq(portalPartnerStaff.userId,userId),
    eq(portalPartnerStaff.partnerId,partnerId),
    eq(portalPartnerStaff.state,"active")
  )).limit(1);
  if(!staff)forbidden();
  const [partner]=await db.select({id:portalPartners.id,verificationState:portalPartners.verificationState})
    .from(portalPartners).where(eq(portalPartners.id,partnerId)).limit(1);
  if(!partner||partner.verificationState!=="verified")forbidden();
  return staff;
}

/** Membership and team authority are always looked up server-side. */
async function authorizedRoom(userId:number,inquiryId:number){
  const db=await database();
  const [room]=await db.select({
    id:portalPartnerInquiries.id,partnerId:portalPartnerInquiries.partnerId,
    userId:portalPartnerInquiries.userId,state:portalPartnerInquiries.state,
    partnerState:portalPartners.verificationState,
  }).from(portalPartnerInquiries)
    .innerJoin(portalPartners,eq(portalPartners.id,portalPartnerInquiries.partnerId))
    .where(eq(portalPartnerInquiries.id,inquiryId)).limit(1);
  if(!room || room.state!=="new" || room.partnerState!=="verified")forbidden();
  if(room.userId===userId){
    if(!await validMember(userId))forbidden();
    return {room,senderKind:"member" as const};
  }
  await staffFor(userId,room.partnerId);
  return {room,senderKind:"partner" as const};
}

export const partnerRouter=router({
  publicProfile:publicProcedure.input(z.object({slug})).query(async ({input})=>{
    if(!enabled())return null;
    const db=await database();
    const [partner]=await db.select({
      id:portalPartners.id,slug:portalPartners.slug,displayName:portalPartners.displayName,
      description:portalPartners.description,
    }).from(portalPartners).where(and(
      eq(portalPartners.slug,input.slug),eq(portalPartners.verificationState,"verified")
    )).limit(1);
    return partner??null;
  }),
  myOrganizations:protectedProcedure.query(async ({ctx})=>{
    requireEnabled();
    const db=await database();
    return db.select({
      id:portalPartners.id,slug:portalPartners.slug,displayName:portalPartners.displayName,
      description:portalPartners.description,draftDescription:portalPartners.draftDescription,
      role:portalPartnerStaff.role,
    }).from(portalPartnerStaff)
      .innerJoin(portalPartners,eq(portalPartners.id,portalPartnerStaff.partnerId))
      .where(and(eq(portalPartnerStaff.userId,ctx.user.id),eq(portalPartnerStaff.state,"active"),
        eq(portalPartners.verificationState,"verified")))
      .limit(30);
  }),
  submitProfileEdit:protectedProcedure.input(z.object({
    partnerId:id,description:z.string().trim().min(30).max(2400),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    rateLimit("partner-edit:"+ctx.user.id);
    const staff=await staffFor(ctx.user.id,input.partnerId);
    if(staff.role!=="owner")forbidden();
    const db=await database();
    await db.update(portalPartners).set({draftDescription:input.description})
      .where(and(eq(portalPartners.id,input.partnerId),eq(portalPartners.verificationState,"verified")));
    return {submittedForReview:true as const};
  }),
  pendingProfileEdits:protectedProcedure.query(async ({ctx})=>{
    requireEnabled();
    if(ctx.user.role!=="admin")forbidden();
    const db=await database();
    return db.select({
      id:portalPartners.id,displayName:portalPartners.displayName,
      draftDescription:portalPartners.draftDescription,
    }).from(portalPartners).where(and(
      eq(portalPartners.verificationState,"verified"),
      isNotNull(portalPartners.draftDescription)
    )).limit(50);
  }),
  approveProfileEdit:protectedProcedure.input(z.object({partnerId:id,approve:z.boolean()}))
    .mutation(async ({ctx,input})=>{
      requireEnabled();checkRequestOrigin(ctx.req);
      if(ctx.user.role!=="admin")forbidden();
      const db=await database();
      const [partner]=await db.select({
        draftDescription:portalPartners.draftDescription,
        verificationState:portalPartners.verificationState,
      }).from(portalPartners).where(eq(portalPartners.id,input.partnerId)).limit(1);
      if(!partner||partner.verificationState!=="verified"||!partner.draftDescription)
        throw new TRPCError({code:"NOT_FOUND",message:"Revisão indisponível."});
      await db.update(portalPartners).set({
        description:input.approve?partner.draftDescription:undefined,
        draftDescription:null,
      }).where(and(eq(portalPartners.id,input.partnerId),
        eq(portalPartners.verificationState,"verified"),
        eq(portalPartners.draftDescription,partner.draftDescription)));
      return {reviewed:true as const};
    }),
  sendInquiry:protectedProcedure.input(z.object({
    partnerId:id,
    message:z.string().trim().min(20).max(1500),
    consentToShareMessage:z.literal(true),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    rateLimit("partner-inquiry:"+ctx.user.id);
    if(!await validMember(ctx.user.id))forbidden();
    const db=await database();
    const [partner]=await db.select({id:portalPartners.id})
      .from(portalPartners).where(and(eq(portalPartners.id,input.partnerId),
        eq(portalPartners.verificationState,"verified"))).limit(1);
    if(!partner)throw new TRPCError({code:"NOT_FOUND",message:"Organização indisponível."});
    await db.insert(portalPartnerInquiries).values({
      partnerId:partner.id,userId:ctx.user.id,
      message:input.message,consentAt:new Date(),state:"new",
    });
    return {received:true as const};
  }),
  myInquiries:protectedProcedure.query(async ({ctx})=>{
    requireEnabled();
    const db=await database();
    return db.select({
      id:portalPartnerInquiries.id,partnerId:portalPartnerInquiries.partnerId,
      message:portalPartnerInquiries.message,state:portalPartnerInquiries.state,
      createdAt:portalPartnerInquiries.createdAt,
    }).from(portalPartnerInquiries).where(eq(portalPartnerInquiries.userId,ctx.user.id))
      .orderBy(desc(portalPartnerInquiries.createdAt),desc(portalPartnerInquiries.id)).limit(50);
  }),
  withdrawInquiry:protectedProcedure.input(z.object({inquiryId:id}))
    .mutation(async ({ctx,input})=>{
      requireEnabled();checkRequestOrigin(ctx.req);
      const db=await database();
      await db.update(portalPartnerInquiries).set({state:"withdrawn"})
        .where(and(eq(portalPartnerInquiries.id,input.inquiryId),
          eq(portalPartnerInquiries.userId,ctx.user.id),
          eq(portalPartnerInquiries.state,"new")));
      // Revocation stops any further availability in the partner's inbox.
      // Already-read information cannot be recalled; UI must disclose this.
      return {processed:true as const};
    }),
  inbox:protectedProcedure.input(z.object({partnerId:id})).query(async ({ctx,input})=>{
    requireEnabled();
    await staffFor(ctx.user.id,input.partnerId);
    const db=await database();
    return db.select({
      id:portalPartnerInquiries.id,message:portalPartnerInquiries.message,
      createdAt:portalPartnerInquiries.createdAt,
    }).from(portalPartnerInquiries)
      .where(and(eq(portalPartnerInquiries.partnerId,input.partnerId),
        eq(portalPartnerInquiries.state,"new")))
      .orderBy(desc(portalPartnerInquiries.createdAt),desc(portalPartnerInquiries.id)).limit(50);
    // No userId, email, phone or learner memory returned.
  }),
  roomMessages:protectedProcedure.input(z.object({inquiryId:id})).query(async ({ctx,input})=>{
    requireEnabled();
    const {room}=await authorizedRoom(ctx.user.id,input.inquiryId);
    const db=await database();
    const records=await db.select({
      id:portalInquiryMessages.id,body:portalInquiryMessages.body,
      senderKind:portalInquiryMessages.senderKind,createdAt:portalInquiryMessages.createdAt,
    }).from(portalInquiryMessages)
      .where(eq(portalInquiryMessages.inquiryId,room.id))
      .orderBy(asc(portalInquiryMessages.id)).limit(100);
    return {messages:records};
  }),
  sendRoomMessage:protectedProcedure.input(z.object({
    inquiryId:id,body:z.string().trim().min(2).max(3000),
  })).mutation(async ({ctx,input})=>{
    requireEnabled();checkRequestOrigin(ctx.req);
    rateLimit("partner-room:"+ctx.user.id);
    const {room,senderKind}=await authorizedRoom(ctx.user.id,input.inquiryId);
    const db=await database();
    await db.transaction(async tx=>{
      // Lock the room state to serialize against close and withdrawal.
      const [current]=await tx.select({state:portalPartnerInquiries.state})
        .from(portalPartnerInquiries).where(eq(portalPartnerInquiries.id,room.id))
        .for("update").limit(1);
      if(!current || current.state!=="new")forbidden();
      await tx.insert(portalInquiryMessages).values({
        inquiryId:room.id,senderUserId:ctx.user.id,senderKind,body:input.body,
      });
    });
    return {sent:true as const};
  }),
  closeInquiry:protectedProcedure.input(z.object({partnerId:id,inquiryId:id}))
    .mutation(async ({ctx,input})=>{
      requireEnabled();checkRequestOrigin(ctx.req);
      await staffFor(ctx.user.id,input.partnerId);
      const db=await database();
      await db.update(portalPartnerInquiries).set({state:"closed"})
        .where(and(eq(portalPartnerInquiries.partnerId,input.partnerId),
          eq(portalPartnerInquiries.id,input.inquiryId),
          eq(portalPartnerInquiries.state,"new")));
      return {processed:true as const};
    }),
});
