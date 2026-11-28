import {and,eq,asc,lte,gt,or} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {reviewLogs} from "../drizzle/schema";
import {mysqlGamificationLedger} from "./gamification-mysql-lab";
import {importOwnedReviewEvidence} from "./gamification-review-import-lab";
// Laboratory only: caller must derive userId from authenticated session.
// Bounded chronological pages, with a fixed cutoff and a server-owned cursor.
export async function importAuthenticatedReviewHistory(db:MySql2Database,userId:number,nowMs=Date.now(),cursor?:{timeMs:number;logId:number}){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||!Number.isSafeInteger(nowMs)||nowMs<0||nowMs>8640000000000000)throw Error("Invalid import context");
 if(cursor&&(!Number.isSafeInteger(cursor.timeMs)||cursor.timeMs<0||cursor.timeMs>nowMs||!Number.isSafeInteger(cursor.logId)||cursor.logId<=0))throw Error("Invalid cursor");
 const after=cursor?or(gt(reviewLogs.createdAt,new Date(cursor.timeMs)),and(eq(reviewLogs.createdAt,new Date(cursor.timeMs)),gt(reviewLogs.id,cursor.logId))):undefined;
 const rows=await db.select({logId:reviewLogs.id,createdAt:reviewLogs.createdAt}).from(reviewLogs).where(and(eq(reviewLogs.userId,userId),lte(reviewLogs.createdAt,new Date(nowMs)),after)).orderBy(asc(reviewLogs.createdAt),asc(reviewLogs.id)).limit(1001);
 const page=rows.slice(0,1000);
 const receipts=await importOwnedReviewEvidence(mysqlGamificationLedger(db),userId,page,nowMs);
 const last=page[page.length-1];
 return {processed:receipts.length,cutoffMs:nowMs,nextCursor:rows.length>1000&&last?{timeMs:last.createdAt.getTime(),logId:last.logId}:null};
}
