import {examItineraries} from "../drizzle/exam-history-draft";
import {optionalItineraryTable} from "./exam-itinerary-repository";
import {randomUUID} from "node:crypto";
import {and,eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {TRPCError} from "@trpc/server";
import {z} from "zod";
import {users} from "../drizzle/schema";
import {examGoals as goals,examCompletedActivities as completed,examActiveAttempts as active} from "../drizzle/exam-history-draft";
import {EXAM_MODES,type ExamMode,type ExamSkill,type IeltsVariant,type ExamResult} from "../shared/exam-contract";
import {gradeExamSet,publicExamAttempt,resolveExamSet,examVersion,examDuration} from "./exam-engine";
import {examGoalInput,type ExamGoalInput} from "../shared/exam-history-contract";

const receiptSchema=z.object({correct:z.number().int().min(0).max(40),total:z.number().int().min(1).max(40),mode:z.enum(EXAM_MODES),version:z.string().min(1).max(80),items:z.array(z.object({id:z.string(),correct:z.boolean(),expected:z.string(),explanation:z.string()}).strict()).max(40)}).strict().refine(r=>r.total===r.items.length&&r.correct===r.items.filter(i=>i.correct).length);
type Tx=Parameters<Parameters<MySql2Database["transaction"]>[0]>[0];
const missing=()=>new TRPCError({code:"NOT_FOUND",message:"Atividade indisponível. Inicie uma nova."});
async function lockOwner(tx:Tx,owner:number){
 if(!Number.isSafeInteger(owner)||owner<=0||owner>2147483647)throw missing();
 const [user]=await tx.select({id:users.id}).from(users).where(eq(users.id,owner)).limit(1).for("update");
 if(!user)throw missing();
}
export function createDurableExamEngine(db:MySql2Database,clock=Date.now){
 return {
  async start(owner:number,variant:IeltsVariant,mode:ExamMode,skill:ExamSkill="reading",exerciseId?:string){
   if(skill==="listening"&&mode==="timed")throw new TRPCError({code:"BAD_REQUEST",message:"Listening cronometrado ainda não disponível."});
   const set=resolveExamSet(variant,skill,exerciseId,mode);
   return db.transaction(async tx=>{
    await lockOwner(tx,owner);
    const now=clock(),attempt=publicExamAttempt(randomUUID(),variant,mode,set,now+examDuration(set,mode));
    const value={attemptId:attempt.id,variant,skill,mode,exerciseId:set.id,contentVersion:attempt.version,deadlineMs:attempt.deadline};
    await tx.insert(active).values({userId:owner,...value}).onDuplicateKeyUpdate({set:value});
    return attempt;
   });
  },
  async resume(owner:number){
   return db.transaction(async tx=>{
    await lockOwner(tx,owner);
    const [row]=await tx.select().from(active).where(eq(active.userId,owner)).limit(1);
    if(!row||clock()>=row.deadlineMs)return null;
    const set=resolveExamSet(row.variant,row.skill,row.exerciseId,row.mode);
    if(row.contentVersion!==examVersion(set))return null;
    return publicExamAttempt(row.attemptId,row.variant,row.mode,set,row.deadlineMs);
   });
  },
  async submit(owner:number,id:string,answers:Record<string,string>):Promise<ExamResult>{
   return db.transaction(async tx=>{
    await lockOwner(tx,owner);
    const [prior]=await tx.select().from(completed).where(and(eq(completed.userId,owner),eq(completed.attemptId,id))).limit(1);
    if(prior){
     if(!prior.receiptJson)throw missing();
     const receipt=receiptSchema.parse(JSON.parse(prior.receiptJson));
     if(receipt.correct!==prior.correct||receipt.total!==prior.total||receipt.version!==prior.contentVersion||receipt.mode!==prior.mode)throw Error("Exam receipt mismatch");
     return receipt;
    }
    const [row]=await tx.select().from(active).where(and(eq(active.userId,owner),eq(active.attemptId,id))).limit(1);
    if(!row)throw missing();
    const now=clock();
    const set=resolveExamSet(row.variant,row.skill,row.exerciseId,row.mode);
    if(now>=row.deadlineMs||row.contentVersion!==examVersion(set))throw new TRPCError({code:"PRECONDITION_FAILED",message:"Atividade expirada ou atualizada. Inicie outra."});
    const result=gradeExamSet(set,row.mode,row.contentVersion,answers);
    await tx.insert(completed).values({userId:owner,attemptId:id,variant:row.variant,skill:row.skill,mode:row.mode,exerciseId:row.exerciseId,contentVersion:row.contentVersion,correct:result.correct,total:result.total,completedAtMs:now,receiptJson:JSON.stringify(receiptSchema.parse(result))});
    await tx.delete(active).where(eq(active.userId,owner));
    return result;
   });
  },
  async saveGoal(owner:number,input:ExamGoalInput){
   const goal=examGoalInput.parse(input);
   await db.transaction(async tx=>{await lockOwner(tx,owner);await tx.insert(goals).values({userId:owner,...goal,updatedAtMs:clock()}).onDuplicateKeyUpdate({set:{...goal,updatedAtMs:clock()}});});
  },
  async clear(owner:number){
   await db.transaction(async tx=>{
    await lockOwner(tx,owner);
    await optionalItineraryTable(async()=>{await tx.delete(examItineraries).where(eq(examItineraries.userId,owner));},undefined);
    await tx.delete(active).where(eq(active.userId,owner));
    await tx.delete(completed).where(eq(completed.userId,owner));
    await tx.delete(goals).where(eq(goals.userId,owner));
   });
  }
 };
}
