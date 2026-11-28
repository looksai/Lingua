import {and,desc,eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {examGoals as goals,examCompletedActivities as activities} from "../drizzle/exam-history-draft";
import {examGoalInput,completedExamActivity,type ExamGoalInput,type CompletedExamActivity} from "../shared/exam-history-contract";

function requireOwner(owner:number){if(!Number.isSafeInteger(owner)||owner<=0||owner>2147483647)throw Error("Invalid exam history owner");}
export async function saveExamGoal(db:MySql2Database,owner:number,input:ExamGoalInput,now=Date.now()){
 requireOwner(owner);const goal=examGoalInput.parse(input);
 if(!Number.isSafeInteger(now)||now<=0)throw Error("Invalid goal timestamp");
 await db.insert(goals).values({userId:owner,...goal,updatedAtMs:now}).onDuplicateKeyUpdate({set:{...goal,updatedAtMs:now}});
}
export async function readExamGoal(db:MySql2Database,owner:number){
 requireOwner(owner);const [goal]=await db.select({variant:goals.variant,targetBandHalfSteps:goals.targetBandHalfSteps,targetDate:goals.targetDate,updatedAtMs:goals.updatedAtMs}).from(goals).where(eq(goals.userId,owner)).limit(1);
 return goal??null;
}
// Trusted server grading only. Do not wire this to client-provided totals.
// Repeated attempt IDs return the first committed row; no mutation of its provenance.
export async function recordCompletedExamActivity(db:MySql2Database,owner:number,input:CompletedExamActivity){
 requireOwner(owner);const value=completedExamActivity.parse(input);
 return db.transaction(async tx=>{
  await tx.insert(activities).values({userId:owner,...value}).onDuplicateKeyUpdate({set:{attemptId:value.attemptId}});
  const [row]=await tx.select().from(activities).where(and(eq(activities.userId,owner),eq(activities.attemptId,value.attemptId))).limit(1);
  if(!row)throw Error("Committed exam activity missing");
  return completedExamActivity.parse({attemptId:row.attemptId,variant:row.variant,skill:row.skill,exerciseId:row.exerciseId,contentVersion:row.contentVersion,mode:row.mode,correct:row.correct,total:row.total,completedAtMs:row.completedAtMs});
 });
}
export async function recentExamActivities(db:MySql2Database,owner:number,limit=50){
 requireOwner(owner);if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid history limit");
 return db.select({attemptId:activities.attemptId,variant:activities.variant,skill:activities.skill,exerciseId:activities.exerciseId,contentVersion:activities.contentVersion,mode:activities.mode,correct:activities.correct,total:activities.total,completedAtMs:activities.completedAtMs}).from(activities).where(eq(activities.userId,owner)).orderBy(desc(activities.completedAtMs),desc(activities.id)).limit(limit);
}
// Laboratory-only deletion primitive. Before public wiring, serialize against live
// attempt submission and invalidate pending attempts to prevent resurrection.
export async function clearExamHistory(db:MySql2Database,owner:number){
 requireOwner(owner);
 await db.transaction(async tx=>{
  await tx.delete(activities).where(eq(activities.userId,owner));
  await tx.delete(goals).where(eq(goals.userId,owner));
 });
}
