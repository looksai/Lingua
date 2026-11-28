import {reportCommunityPublication} from "./community-report-lab";
import {and,asc,eq,gt} from "drizzle-orm";
import {communityBlocks} from "../drizzle/community-safety-draft";
import {setCommunityBlock} from "./community-safety-lab";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {router,protectedProcedure} from "./_core/trpc";
import {getDb} from "./db";
import {checkRequestOrigin,rateLimit} from "./auth-local";
import {redeemTrialLab} from "./trial-redemption-lab";
import {readGamificationPrivacy, saveGamificationPrivacy} from "./gamification-privacy-lab";
import {commercialAccessLab} from "./commercial-repository-lab";
async function dbForLab(){
 if(process.env.LINGUA_COMMERCIAL_LAB_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED"});
 const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED"});return db;
}
function confirmAccount(accountId:number|undefined, userId:number) {
  if(accountId!==undefined && accountId!==userId) throw new TRPCError({code:"FORBIDDEN",message:"Sua sessão mudou. Recarregue a página."});
}
const accountId=z.number().int().positive();

export const commercialStudentRouterLab=router({
 reportPublication:protectedProcedure.input(z.object({accountId,ownerId:z.number().int().positive().max(2147483647),achievementId:z.string().min(1).max(80),publishedAtMs:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),reason:z.enum(["spam","harassment","inappropriate","other"])}).strict()).mutation(async({ctx,input})=>{
   confirmAccount(input.accountId,ctx.user.id);checkRequestOrigin(ctx.req);
   rateLimit("community-report:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await dbForLab();
   try{return await reportCommunityPublication(db,ctx.user.id,input);}
   catch{throw new TRPCError({code:"BAD_REQUEST",message:"Não foi possível registrar a denúncia."});}
 }),
 blockedMembers:protectedProcedure.input(z.object({accountId,afterId:z.number().int().positive().optional()}).strict()).query(async({ctx,input})=>{
   confirmAccount(input.accountId,ctx.user.id);
   ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await dbForLab();
   const rows=await db.select({memberId:communityBlocks.targetId}).from(communityBlocks)
     .where(and(eq(communityBlocks.ownerId,ctx.user.id),input.afterId ? gt(communityBlocks.targetId,input.afterId) : undefined))
     .orderBy(asc(communityBlocks.targetId)).limit(21);
   return {members:rows.slice(0,20),next:rows.length>20?rows[19]!.memberId:null};
 }),
 setCommunityBlock:protectedProcedure.input(z.object({accountId,targetId:z.number().int().positive().max(2147483647),blocked:z.boolean()}).strict()).mutation(async({ctx,input})=>{
   confirmAccount(input.accountId,ctx.user.id);checkRequestOrigin(ctx.req);
   rateLimit("community-block:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
   if(input.targetId===ctx.user.id)throw new TRPCError({code:"BAD_REQUEST"});
   const db=await dbForLab();
   if(input.blocked && !await commercialAccessLab(db).isActiveMember(ctx.user.id))throw new TRPCError({code:"FORBIDDEN"});
   await setCommunityBlock(db,ctx.user.id,input.targetId,input.blocked);
   return {processed:true};
 }),
 communityPreferences:protectedProcedure.input(z.object({accountId}).strict()).query(async({ctx,input})=>{
   confirmAccount(input.accountId,ctx.user.id);
   ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await dbForLab();
   const member=await commercialAccessLab(db).isActiveMember(ctx.user.id);
   return {member, preferences:await readGamificationPrivacy(db,ctx.user.id)};
 }),
 saveCommunityPreferences:protectedProcedure.input(z.object({
   accountId,showLevel:z.boolean(),showAchievements:z.boolean(),leaderboardOptIn:z.boolean(),
 }).strict()).mutation(async({ctx,input})=>{
   confirmAccount(input.accountId,ctx.user.id);
   checkRequestOrigin(ctx.req);
   rateLimit("community-preferences:"+ctx.user.id);
   ctx.res.setHeader("Cache-Control","private, no-store");
   const db=await dbForLab();
   if((input.showLevel || input.showAchievements || input.leaderboardOptIn) && !await commercialAccessLab(db).isActiveMember(ctx.user.id)){
     throw new TRPCError({code:"FORBIDDEN",message:"Acesso à comunidade indisponível."});
   }
   await saveGamificationPrivacy(db,ctx.user.id,input);
   return {saved:true};
 }),
 redeemTrial:protectedProcedure.input(z.object({accountId:accountId.optional(),code:z.string().regex(/^[A-Z0-9_-]{4,40}$/)}).strict()).mutation(async({ctx,input})=>{
 confirmAccount(input.accountId,ctx.user.id);
 checkRequestOrigin(ctx.req);rateLimit("commercial-trial:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");
 const db=await dbForLab();
 try{return await redeemTrialLab(db,ctx.user.id,input.code);}
 catch{throw new TRPCError({code:"BAD_REQUEST",message:"Não foi possível resgatar este cupom."});}
 }),
 benefits:protectedProcedure.query(async({ctx})=>{
 ctx.res.setHeader("Cache-Control","private, no-store");rateLimit("commercial-benefits:"+ctx.user.id);
 const access=commercialAccessLab(await dbForLab());
 const names=["course","tutor","exams","community","social-achievements","leaderboard"] as const;
 const values=await Promise.all(names.map(async benefit=>({benefit,allowed:await access.allows(ctx.user.id,benefit)})));
 return {benefits:values};
 })
});
