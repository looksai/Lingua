import { and, eq, desc, isNull, lte, gt, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import {checkRequestOrigin,rateLimit} from "./auth-local";
import {protectedProcedure, publicProcedure, router} from "./_core/trpc";
import {portalPartnerAds,portalPartners,portalPartnerStaff} from "../drizzle/schema";

/**
 * Native Lingua Ads V1: context-only placement, no cookies, behavioral tracking,
 * email targeting, ads revenue claims, price fields or unapproved destinations.
 */
function adsEnabled(){
  return process.env.LINGUA_PORTAL_COMMUNITY_ENABLED==="true" &&
         process.env.LINGUA_PORTAL_ADS_ENABLED==="true";
}
function requireAds(){
  if(!adsEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Lingua Ads em preparação."});
}
function forbidden():never {throw new TRPCError({code:"FORBIDDEN",message:"Operação não autorizada."});}
async function database(){
  const db=await getDb();
  if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Lingua Ads indisponível."});
  return db;
}
const id=z.number().int().positive();
const placement=z.enum(["portal-home","portal-partners"]);
async function owner(userId:number,partnerId:number){
  const db=await database();
  const [staff]=await db.select({role:portalPartnerStaff.role}).from(portalPartnerStaff)
    .innerJoin(portalPartners,eq(portalPartners.id,portalPartnerStaff.partnerId))
    .where(and(
      eq(portalPartnerStaff.userId,userId),
      eq(portalPartnerStaff.partnerId,partnerId),
      eq(portalPartnerStaff.state,"active"),
      eq(portalPartners.verificationState,"verified"),
    )).limit(1);
  if(!staff||staff.role!=="owner")forbidden();
}
export const adsRouter=router({
  placement:publicProcedure.input(z.object({placement})).query(async ({input})=>{
    if(!adsEnabled())return [];
    const db=await database();
    const now=new Date();
    return db.select({
      id:portalPartnerAds.id,title:portalPartnerAds.title,
      body:portalPartnerAds.body,destinationUrl:portalPartnerAds.destinationUrl,
      company:portalPartners.displayName,
    }).from(portalPartnerAds)
      .innerJoin(portalPartners,eq(portalPartnerAds.partnerId,portalPartners.id))
      .where(and(eq(portalPartnerAds.placement,input.placement),
        eq(portalPartnerAds.state,"approved"),
        eq(portalPartners.verificationState,"verified"),
        or(isNull(portalPartnerAds.startsAt),lte(portalPartnerAds.startsAt,now)),
        or(isNull(portalPartnerAds.endsAt),gt(portalPartnerAds.endsAt,now))
      ))
      .orderBy(desc(portalPartnerAds.id)).limit(3);
  }),
  mine:protectedProcedure.input(z.object({partnerId:id})).query(async ({ctx,input})=>{
    requireAds();
    await owner(ctx.user.id,input.partnerId);
    const db=await database();
    return db.select({
      id:portalPartnerAds.id,title:portalPartnerAds.title,
      body:portalPartnerAds.body,placement:portalPartnerAds.placement,
      state:portalPartnerAds.state,createdAt:portalPartnerAds.createdAt,
    }).from(portalPartnerAds).where(eq(portalPartnerAds.partnerId,input.partnerId))
      .orderBy(desc(portalPartnerAds.id)).limit(50);
  }),
  create:protectedProcedure.input(z.object({
    partnerId:id,placement,
    title:z.string().trim().min(5).max(120),
    body:z.string().trim().min(20).max(600),
  })).mutation(async ({ctx,input})=>{
    requireAds();checkRequestOrigin(ctx.req);
    rateLimit("ads-create:"+ctx.user.id);
    await owner(ctx.user.id,input.partnerId);
    const db=await database();
    const [partner]=await db.select({slug:portalPartners.slug}).from(portalPartners)
      .where(and(eq(portalPartners.id,input.partnerId),
        eq(portalPartners.verificationState,"verified"))).limit(1);
    if(!partner)forbidden();
    // Do not allow redirect URLs supplied by advertisers in the MVP.
    const destinationUrl="/portal/parceiro/"+partner.slug;
    await db.insert(portalPartnerAds).values({
      partnerId:input.partnerId,createdByUserId:ctx.user.id,
      placement:input.placement,title:input.title,body:input.body,destinationUrl,
      state:"pending",
    });
    return {pendingReview:true as const};
  }),
  pending:protectedProcedure.query(async ({ctx})=>{
    requireAds();
    if(ctx.user.role!=="admin")forbidden();
    const db=await database();
    return db.select({
      id:portalPartnerAds.id,title:portalPartnerAds.title,
      body:portalPartnerAds.body,placement:portalPartnerAds.placement,
      company:portalPartners.displayName,
    }).from(portalPartnerAds)
      .innerJoin(portalPartners,eq(portalPartnerAds.partnerId,portalPartners.id))
      .where(eq(portalPartnerAds.state,"pending"))
      .orderBy(desc(portalPartnerAds.createdAt)).limit(50);
  }),
  review:protectedProcedure.input(z.object({
    adId:id,approve:z.boolean(),
  })).mutation(async ({ctx,input})=>{
    requireAds();checkRequestOrigin(ctx.req);
    if(ctx.user.role!=="admin")forbidden();
    const db=await database();
    await db.update(portalPartnerAds).set({
      state:input.approve?"approved":"rejected",reviewedByUserId:ctx.user.id,
    }).where(and(eq(portalPartnerAds.id,input.adId),eq(portalPartnerAds.state,"pending")));
    return {reviewed:true as const};
  }),
  pause:protectedProcedure.input(z.object({partnerId:id,adId:id})).mutation(async ({ctx,input})=>{
    requireAds();checkRequestOrigin(ctx.req);
    await owner(ctx.user.id,input.partnerId);
    const db=await database();
    await db.update(portalPartnerAds).set({state:"paused"}).where(and(
      eq(portalPartnerAds.id,input.adId),eq(portalPartnerAds.partnerId,input.partnerId),
      eq(portalPartnerAds.state,"approved")));
    return {paused:true as const};
  }),
});
