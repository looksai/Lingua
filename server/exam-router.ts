import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { checkRequestOrigin,rateLimit } from "./auth-local";
import { examAccess,examEngine } from "./exam-engine";
import { EXAM_MODES,IELTS_VARIANTS,EXAM_CATALOG } from "../shared/exam-contract";
function requireAccess(email:string|null|undefined){
 if(!examAccess(email))throw new TRPCError({code:"FORBIDDEN",message:"Preparação disponível para contas autorizadas no piloto Premium."});
}
export const examRouter=router({
 overview:protectedProcedure.query(({ctx})=>{ctx.res.setHeader("Cache-Control","private, no-store");return {plan:examAccess(ctx.user.email),catalog:EXAM_CATALOG,pilot:true as const};}),
 start:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS),mode:z.enum(EXAM_MODES)}).strict()).mutation(({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-start:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return examEngine.start(ctx.user.id,input.variant,input.mode);
 }),
 submit:protectedProcedure.input(z.object({attemptId:z.uuid(),answers:z.record(z.string().max(24),z.string().max(120)).refine(v=>Object.keys(v).length<=4)}).strict()).mutation(({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-submit:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return examEngine.submit(ctx.user.id,input.attemptId,input.answers);
 })
});
