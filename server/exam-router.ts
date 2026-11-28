import { z } from "zod";
import {eq} from "drizzle-orm";
import {learnerProfiles} from "../drizzle/schema";
import {getDb} from "./db";
import {paidTutorAllowed,freeTutorAllowed,tutorMode,withTutorBudget} from "./tutor-budget";
import {createSelectedTutor} from "./tutor-provider-selector";
import {calCatalogTutorSessions} from "./cal-catalog-runtime";
import {generateWritingFeedback,writingFeedbackEnabled} from "./exam-writing-feedback";
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
 overview:protectedProcedure.query(({ctx})=>{ctx.res.setHeader("Cache-Control","private, no-store");return {plan:examAccess(ctx.user.email),catalog:EXAM_CATALOG,pilot:true as const,feedbackProvider:examAccess(ctx.user.email)&&writingFeedbackEnabled()&&(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email))?tutorMode():null};}),
 speakingPrompts:protectedProcedure.query(({ctx})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");return {version:SPEAKING_VERSION,prompts:SPEAKING_PROMPTS,criteria:SPEAKING_CRITERIA};}),
 writingFeedback:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS),taskId:z.string().max(80),text:z.string().trim().min(1).max(8000),consent:z.literal(true)}).strict()).mutation(async({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-writing-feedback:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  if(!writingFeedbackEnabled()||!(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email)))throw new TRPCError({code:"PRECONDITION_FAILED",message:"Feedback experimental indisponível."});
  const task=writingTasks(input.variant).find(t=>t.id===input.taskId);if(!task)throw new TRPCError({code:"NOT_FOUND",message:"Atividade indisponível."});
  const lease=calCatalogTutorSessions.beginTurn(ctx.user.id);
  const active=()=>{if(!lease.active())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Autorização revogada."});};
  try{
   const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Perfil indisponível."});
   const [p]=await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId,ctx.user.id)).limit(1);
   if(!p||p.allowAIFeedback!==1)throw new TRPCError({code:"FORBIDDEN",message:"Autorização de feedback por IA não registrada no perfil."});
   const result=await withTutorBudget(ctx.user.id,async()=>{active();try{return await generateWritingFeedback(createSelectedTutor(tutorMode()),{tutorName:p.tutorName,tutorPersona:p.tutorPersona,interest:p.interest},task,input.text);}catch{return null;}});
   active();return {feedback:result};
  }finally{lease.release();}
 }),
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
