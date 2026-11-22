import {TRPCError} from "@trpc/server";
import {and,asc,eq} from "drizzle-orm";
import {z} from "zod";
import {learnerProfiles,learnerPlacementAnswers,learnerPlacementPlans} from "../drizzle/schema";
import {PLACEMENT_TASKS,PLAN_VERSION,learnerPlan,placementTaskId} from "../shared/placement";
import {getDb} from "./db";
import {checkRequestOrigin} from "./auth-local";
import {freeTutorAllowed,tutorMode,withTutorBudget} from "./tutor-budget";
import {proposeFourWeekPlan,type PlacementSample} from "./placement-generator";
import {protectedProcedure,router} from "./_core/trpc";

async function placementDb(){
  const db=await getDb();
  if(!db)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Diagnóstico temporariamente indisponível."});
  return db;
}
export const placementRouter=router({
  me:protectedProcedure.query(async ({ctx})=>{
    const db=await placementDb();
    try{
      const [answers,records]=await Promise.all([
        db.select().from(learnerPlacementAnswers).where(eq(learnerPlacementAnswers.userId,ctx.user.id)).orderBy(asc(learnerPlacementAnswers.id)),
        db.select().from(learnerPlacementPlans).where(eq(learnerPlacementPlans.userId,ctx.user.id)).limit(1),
      ]);
      const saved=records[0];
      const parsed=saved?learnerPlan.safeParse(JSON.parse(saved.planJson)):null;
      const plan=parsed?.success?parsed.data:null;
      const nextTask=PLACEMENT_TASKS.find(t=>!answers.some(a=>a.taskId===t.id))??null;
      return {answers:answers.map(a=>({taskId:a.taskId,answer:a.answer,modality:a.modality})),plan,
        source:saved?.source??null,nextTask,status:plan?"provisional" as const:nextTask?"in_progress" as const:"ready_for_plan" as const,
        skills:{writing:"sampled" as const,reading:"not_assessed" as const,listening:"not_assessed" as const,speaking:"not_assessed" as const}};
    }catch{
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"O diagnóstico requer a migration 0006 aprovada no banco de testes."});
    }
  }),
  submit:protectedProcedure.input(z.object({
    consent:z.literal(true),taskId:placementTaskId,
    answer:z.string().trim().min(1).max(800),
    modality:z.enum(["text","asr_text"]).default("text"),
  })).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(tutorMode()!=="groq"||!freeTutorAllowed(ctx.user.email))
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"A sondagem só está habilitada em contas de testes autorizadas."});
    const db=await placementDb();
    try {
      return await db.transaction(async tx=>{
        const [profile]=await tx.select().from(learnerProfiles)
          .where(eq(learnerProfiles.userId,ctx.user.id)).limit(1).for("update");
        if(!profile)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Configure primeiro seu tutor."});
        const responses=await tx.select().from(learnerPlacementAnswers)
          .where(eq(learnerPlacementAnswers.userId,ctx.user.id)).orderBy(asc(learnerPlacementAnswers.id));
        const prior=responses.find(a=>a.taskId===input.taskId);
        if(prior){
          if(prior.answer!==input.answer||prior.modality!==input.modality)
            throw new TRPCError({code:"CONFLICT",message:"Você já enviou uma resposta diferente para esta pergunta."});
          return {saved:true as const,duplicate:true as const};
        }
        const expected=PLACEMENT_TASKS.find(t=>!responses.some(a=>a.taskId===t.id));
        if(!expected||expected.id!==input.taskId)
          throw new TRPCError({code:"CONFLICT",message:"Responda às perguntas na ordem apresentada."});
        await tx.insert(learnerPlacementAnswers).values({
          userId:ctx.user.id,taskId:input.taskId,answer:input.answer,modality:input.modality
        });
        return {saved:true as const,duplicate:false as const};
      });
    }catch(e){
      if(e instanceof TRPCError)throw e;
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível registrar sua resposta de sondagem."});
    }
  }),
  generate:protectedProcedure.input(z.object({consent:z.literal(true)})).mutation(async ({ctx})=>{
    checkRequestOrigin(ctx.req);
    if(tutorMode()!=="groq"||!freeTutorAllowed(ctx.user.email))
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Plano assistido indisponível nesta conta."});
    const db=await placementDb();
    const [profile]=await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId,ctx.user.id)).limit(1);
    if(!profile)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Configure primeiro seu tutor."});
    const existing=await db.select().from(learnerPlacementPlans).where(eq(learnerPlacementPlans.userId,ctx.user.id)).limit(1);
    if(existing.length){
      const parsed=learnerPlan.safeParse(JSON.parse(existing[0].planJson));
      if(parsed.success)return {plan:parsed.data,source:existing[0].source,status:"provisional" as const};
    }
    const answers=await db.select().from(learnerPlacementAnswers)
      .where(eq(learnerPlacementAnswers.userId,ctx.user.id)).orderBy(asc(learnerPlacementAnswers.id));
    if(answers.length!==PLACEMENT_TASKS.length||PLACEMENT_TASKS.some(t=>!answers.some(a=>a.taskId===t.id)))
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Responda às três perguntas antes de criar seu plano."});
    const samples:PlacementSample[]=PLACEMENT_TASKS.map(t=>{
      const answer=answers.find(a=>a.taskId===t.id)!;
      return {taskId:t.id,prompt:t.prompt,answer:answer.answer,modality:answer.modality};
    });
    const result=await withTutorBudget(ctx.user.id,()=>proposeFourWeekPlan(samples,profile.interest));
    try{
      await db.insert(learnerPlacementPlans).values({userId:ctx.user.id,planJson:JSON.stringify(result.plan),
        source:result.source,version:PLAN_VERSION})
        .onDuplicateKeyUpdate({set:{updatedAt:new Date()}});
    }catch{
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível salvar o plano. Nenhum resultado foi certificado."});
    }
    return {...result,status:"provisional" as const};
  }),
  clear:protectedProcedure.mutation(async ({ctx})=>{
    checkRequestOrigin(ctx.req);
    const db=await placementDb();
    try{
      await db.transaction(async tx=>{
        const [profile]=await tx.select().from(learnerProfiles)
          .where(eq(learnerProfiles.userId,ctx.user.id)).limit(1).for("update");
        if(!profile)throw new TRPCError({code:"PRECONDITION_FAILED",message:"Perfil indisponível."});
        await tx.delete(learnerPlacementPlans).where(eq(learnerPlacementPlans.userId,ctx.user.id));
        await tx.delete(learnerPlacementAnswers).where(eq(learnerPlacementAnswers.userId,ctx.user.id));
      });
      return {cleared:true as const};
    }catch(error){
      if(error instanceof TRPCError)throw error;
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível limpar as respostas."});
    }
  }),
});
