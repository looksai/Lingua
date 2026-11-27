import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {academyBudgetCounters as counters} from "../drizzle/academy-budget-draft";

const DAY=86_400_000;
type Limits={global:number;perUser:number};
/**
 * Counts provider-operation units, not currency. Reserve and commit BEFORE
 * contacting a provider. Failed operations are charged conservatively.
 * Global row is always acquired first; no network calls inside the transaction.
 * A stale/rolled-back clock cannot reset the counter. No fallback on DB error.
 * Draft repository, not wired to the production tutor.
 */
export async function reserveAcademyBudget(
  db:MySql2Database, userId:number, units:number, limits:Limits, now=Date.now(),
):Promise<boolean>{
  if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||
     !Number.isSafeInteger(units)||units<1||units>2||
     !Number.isSafeInteger(now)||now<0||
     !Number.isSafeInteger(limits.global)||limits.global<units||limits.global>100||
     !Number.isSafeInteger(limits.perUser)||limits.perUser<units||limits.perUser>30)return false;
  const day=Math.floor(now/DAY);
  if(day>2147483647)return false;
  return db.transaction(async tx=>{
    await tx.insert(counters).values({scopeId:0,utcDay:day,used:0}).onDuplicateKeyUpdate({set:{scopeId:0}});
    const [global]=await tx.select().from(counters).where(eq(counters.scopeId,0)).for("update");
    if(!global||global.utcDay>day||global.used<0)return false;
    const total=global.utcDay===day?global.used:0;
    if(total+units>limits.global)return false;
    await tx.insert(counters).values({scopeId:userId,utcDay:day,used:0}).onDuplicateKeyUpdate({set:{scopeId:userId}});
    const [account]=await tx.select().from(counters).where(eq(counters.scopeId,userId)).for("update");
    if(!account||account.utcDay>day||account.used<0)return false;
    const used=account.utcDay===day?account.used:0;
    if(used+units>limits.perUser)return false;
    await tx.update(counters).set({utcDay:day,used:total+units}).where(eq(counters.scopeId,0));
    await tx.update(counters).set({utcDay:day,used:used+units}).where(eq(counters.scopeId,userId));
    return true;
  });
}
