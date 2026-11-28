import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {router,protectedProcedure} from "./_core/trpc";
import {getDb} from "./db";
import {checkRequestOrigin,rateLimit} from "./auth-local";
import {redeemTrialLab} from "./trial-redemption-lab";
import {commercialAccessLab} from "./commercial-repository-lab";
async function dbForLab(){
 if(process.env.LINGUA_COMMERCIAL_LAB_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED"});
 const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED"});return db;
}
export const commercialStudentRouterLab=router({
 redeemTrial:protectedProcedure.input(z.object({code:z.string().regex(/^[A-Z0-9_-]{4,40}$/)}).strict()).mutation(async({ctx,input})=>{
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
