import {and,eq,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {users} from "../drizzle/schema";
import {examGoals,examActiveAttempts,examCompletedActivities} from "../drizzle/exam-history-draft";
import {examRetentionCutoffs} from "../shared/exam-retention";

// No implicit background execution. Serialized against the durable exam engine.
export async function purgeExpiredExamDataForOwner(db:MySql2Database,owner:number,now=Date.now()){
 if(!Number.isSafeInteger(owner)||owner<=0||owner>2147483647)throw Error("Invalid retention owner");
 const cutoff=examRetentionCutoffs(now);
 return db.transaction(async tx=>{
  const [user]=await tx.select({id:users.id}).from(users).where(eq(users.id,owner)).limit(1).for("update");
  if(!user)return;
  await tx.delete(examActiveAttempts).where(and(eq(examActiveAttempts.userId,owner),lte(examActiveAttempts.deadlineMs,cutoff.attempt)));
  await tx.delete(examCompletedActivities).where(and(eq(examCompletedActivities.userId,owner),lte(examCompletedActivities.completedAtMs,cutoff.history)));
  await tx.delete(examGoals).where(and(eq(examGoals.userId,owner),lte(examGoals.updatedAtMs,cutoff.history)));
 });
}
