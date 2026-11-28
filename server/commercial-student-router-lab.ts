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
