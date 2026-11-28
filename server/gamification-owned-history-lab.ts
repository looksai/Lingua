import {and,eq,asc,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {reviewLogs} from "../drizzle/schema";
import {mysqlGamificationLedger} from "./gamification-mysql-lab";
import {importOwnedReviewEvidence} from "./gamification-review-import-lab";
// Laboratory only: caller must derive userId from authenticated session.
// Bounded chronological import, fail closed on overflow rather than silently omit history.
export async function importAuthenticatedReviewHistory(db:MySql2Database,userId:number,nowMs=Date.now()){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||!Number.isSafeInteger(nowMs)||nowMs<0||nowMs>8640000000000000)throw Error("Invalid import context");
 const rows=await db.select({logId:reviewLogs.id,createdAt:reviewLogs.createdAt}).from(reviewLogs).where(and(eq(reviewLogs.userId,userId),lte(reviewLogs.createdAt,new Date(nowMs)))).orderBy(asc(reviewLogs.createdAt),asc(reviewLogs.id)).limit(1001);
 if(rows.length>1000)throw Error("Review history requires paginated import");
 const receipts=await importOwnedReviewEvidence(mysqlGamificationLedger(db),userId,rows,nowMs);
 return {processed:receipts.length};
}
