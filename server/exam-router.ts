import {saveItineraryInput} from "../shared/exam-itinerary";
import {readItinerary,saveItinerary} from "./exam-itinerary-repository";
import { z } from "zod";
import {eq} from "drizzle-orm";
import {learnerProfiles} from "../drizzle/schema";
import {getDb} from "./db";
import {examProposalsEnabled,proposeExamPractice} from "./exam-practice-proposals";
import {createDurableExamEngine} from "./exam-durable-engine";
import {readExamGoal,recentExamActivities,exportExamHistoryPage} from "./exam-history-repository";
import {examGoalInput} from "../shared/exam-history-contract";
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
export function durableExamEnabled(env:NodeJS.ProcessEnv=process.env){return env.LINGUA_EXAM_DURABLE_ENABLED==="true";}
async function historyDb(){if(!durableExamEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Histórico permanente ainda indisponível."});const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Histórico temporariamente indisponível."});return db;}
export function examPrivacyEnabled(env:NodeJS.ProcessEnv=process.env){return durableExamEnabled(env)||env.LINGUA_EXAM_PRIVACY_ENABLED==="true";}
async function privacyDb(){if(!examPrivacyEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Dados persistentes ainda indisponíveis."});const db=await getDb();if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Dados temporariamente indisponíveis."});return db;}
export const examRouter=router({
 itinerary:protectedProcedure.query(async({ctx})=>{
   requireAccess(ctx.user.email);
   ctx.res.setHeader("Cache-Control","private, no-store");
   if(process.env.LINGUA_EXAM_ITINERARY_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED"});
   return {accountId:ctx.user.id,saved:await readItinerary(await historyDb(),ctx.user.id)};
 }),
 saveItinerary:protectedProcedure.input(saveItineraryInput).mutation(async({ctx,input})=>{
   checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);
   ctx.res.setHeader("Cache-Control","private, no-store");
   if(process.env.LINGUA_EXAM_ITINERARY_ENABLED!=="true")throw new TRPCError({code:"PRECONDITION_FAILED"});
   rateLimit("exam-itinerary:"+ctx.user.id);
   return saveItinerary(await historyDb(),ctx.user.id,input);
 }),
 privacyStatus:protectedProcedure.query(({ctx})=>{ctx.res.setHeader("Cache-Control","private, no-store");return {enabled:examPrivacyEnabled()};}),
 privacyExport:protectedProcedure.input(z.object({beforeId:z.number().int().positive().max(2147483647).nullable()}).strict()).mutation(async({ctx,input})=>{checkRequestOrigin(ctx.req);rateLimit("exam-export:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");return exportExamHistoryPage(await privacyDb(),ctx.user.id,input.beforeId);}),
 privacyClear:protectedProcedure.input(z.object({confirm:z.literal(true)}).strict()).mutation(async({ctx})=>{checkRequestOrigin(ctx.req);rateLimit("exam-privacy-clear:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");await createDurableExamEngine(await privacyDb()).clear(ctx.user.id);return {cleared:true as const};}),
 overview:protectedProcedure.query(({ctx})=>{ctx.res.setHeader("Cache-Control","private, no-store");return {plan:examAccess(ctx.user.email),catalog:EXAM_CATALOG,pilot:true as const,itinerary:Boolean(examAccess(ctx.user.email))&&durableExamEnabled()&&process.env.LINGUA_EXAM_ITINERARY_ENABLED==="true",durable:Boolean(examAccess(ctx.user.email))&&durableExamEnabled(),proposals:Boolean(examAccess(ctx.user.email))&&durableExamEnabled()&&examProposalsEnabled(),feedbackProvider:examAccess(ctx.user.email)&&writingFeedbackEnabled()&&(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email))?tutorMode():null};}),
 practiceProposals:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS)}).strict()).query(async({ctx,input})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");if(!examProposalsEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Recomendações ainda indisponíveis."});return proposeExamPractice(input.variant,await recentExamActivities(await historyDb(),ctx.user.id));}),
 history:protectedProcedure.query(async({ctx})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");const db=await historyDb();return {goal:await readExamGoal(db,ctx.user.id),activities:await recentExamActivities(db,ctx.user.id)};}),
 resume:protectedProcedure.query(async({ctx})=>{requireAccess(ctx.user.email);ctx.res.setHeader("Cache-Control","private, no-store");return createDurableExamEngine(await historyDb()).resume(ctx.user.id);}),
 saveGoal:protectedProcedure.input(examGoalInput).mutation(async({ctx,input})=>{checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-goal:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");await createDurableExamEngine(await historyDb()).saveGoal(ctx.user.id,input);return {saved:true as const};}),
 clearHistory:protectedProcedure.input(z.object({confirm:z.literal(true)}).strict()).mutation(async({ctx})=>{checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-clear:"+ctx.user.id);ctx.res.setHeader("Cache-Control","private, no-store");await createDurableExamEngine(await historyDb()).clear(ctx.user.id);return {cleared:true as const};}),
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
 start:protectedProcedure.input(z.object({variant:z.enum(IELTS_VARIANTS),mode:z.enum(EXAM_MODES),skill:z.enum(EXAM_SKILLS).default("reading"),exerciseId:z.string().max(80).optional()}).strict()).mutation(async({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-start:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return (durableExamEnabled()?createDurableExamEngine(await historyDb()):examEngine).start(ctx.user.id,input.variant,input.mode,input.skill,input.exerciseId);
 }),
 submit:protectedProcedure.input(z.object({attemptId:z.uuid(),answers:z.record(z.string().max(24),z.string().max(120)).refine(v=>Object.keys(v).length<=12)}).strict()).mutation(async({ctx,input})=>{
  checkRequestOrigin(ctx.req);requireAccess(ctx.user.email);rateLimit("exam-submit:"+ctx.user.id);
  ctx.res.setHeader("Cache-Control","private, no-store");
  return (durableExamEnabled()?createDurableExamEngine(await historyDb()):examEngine).submit(ctx.user.id,input.attemptId,input.answers);
 })
});
