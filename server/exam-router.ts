import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { checkRequestOrigin,rateLimit } from "./auth-local";
import {SPEAKING_PROMPTS,SPEAKING_VERSION,SPEAKING_CRITERIA} from "../shared/exam-speaking-contract";
import {writingTasks,reviewWriting} from "./exam-writing";
import { examAccess,examEngine,examExercises } from "./exam-engine";
import { EXAM_MODES,EXAM_SKILLS,IELTS_VARIANTS,EXAM_CATALOG } from "../shared/exam-contract";
function requireAccess(email:string|null|undefined){
 if(!examAccess(email))throw new TRPCError({code:"FORBIDDEN",message:"Preparação disponível para contas autorizadas no piloto Premium."});
}
export const examRouter=router({
 overview:protectedProcedure.query(({ctx})=>{ctx.res.setHeader("Cache-Control","private, no-store");return {plan:examAccess(ctx.user.email),catalog:EXAM_CATALOG,pilot:true as const};}),
 speakingPrompts:protectedProcedure.query(({ctx})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");return {version:SPEAKING_VERSION,prompts:SPEAKING_PROMPTS,criteria:SPEAKING_CRITERIA};}),
 writingTasks:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS)}).strict()).query(({ctx,input})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");return writingTasks(input.variant);}),
 writingReview:protectedProcedure.input(z.object({taskId:z.string().max(80),text:z.string().trim().min(1).max(20000)}).strict()).mutation(({ctx,input})=>{checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-writing:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");const review=reviewWriting(input.taskId,input.text);if(!review)throw new TRPCError({code:"NOT_FOUND",message:"Atividade indisponível."});return review;}),
 exercises:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS),skill:z.enum(EXAM_SKILLS)})).query(({ctx,input})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");return examExercises(input.variant,input.skill);}),
 start:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS),mode:z.enum(EXAM_MODES),skill:z.enum(EXAM_SKILLS).default("reading"),exerciseId:z.string().max(80).optional()}).strict()).mutation(({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-start:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return examEngine.start(ctx.user.id,input.variant,input.mode,input.skill,input.exerciseId);
 }),
 submit:protectedProcedure.input(z.object({attemptId:z.uuid(),answers:z.record(z.string().max(24),z.string().max(120)).refine(v=>Object.keys(v).length<=4)}).strict()).mutation(({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-submit:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return examEngine.submit(ctx.user.id,input.attemptId,input.answers);
 })
});
