import {and,eq,gte,lt,gt} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {users} from "../drizzle/schema";
import {gamificationEvidence as evidence} from "../drizzle/gamification-draft";
import type {GamificationLedger,LedgerEntry} from "./gamification-ledger";
import {GAMIFICATION_POLICY_VERSION} from "../shared/gamification-contract";
// Laboratory adapter only. No router or production migration wiring.
export function mysqlGamificationLedger(db:MySql2Database):GamificationLedger{
 return {transaction:async(userId,work)=>{
  if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647)throw Error("Invalid owner");
  return db.transaction(async tx=>{
   const [owner]=await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for("update");
   if(!owner)throw Error("Unknown owner");
   return work({
    async find(kind,sourceId){
     const [row]=await tx.select().from(evidence).where(and(eq(evidence.userId,userId),eq(evidence.kind,kind),eq(evidence.sourceId,sourceId))).limit(1).for("update");
     if(!row)return undefined;
     if(row.policyVersion!==GAMIFICATION_POLICY_VERSION)throw Error("Unsupported award policy");
     return {kind:row.kind,sourceId:row.sourceId,occurredAtMs:row.occurredAtMs,xp:row.awardedXp,policyVersion:GAMIFICATION_POLICY_VERSION};
    },
    async countAwarded(kind,fromMs,toMs){
     const rows=await tx.select({id:evidence.id}).from(evidence).where(and(eq(evidence.userId,userId),eq(evidence.kind,kind),gte(evidence.occurredAtMs,fromMs),lt(evidence.occurredAtMs,toMs),gt(evidence.awardedXp,0))).for("update");
     return rows.length;
    },
    async insert(entry:LedgerEntry){
     await tx.insert(evidence).values({userId,kind:entry.kind,sourceId:entry.sourceId,occurredAtMs:entry.occurredAtMs,policyVersion:entry.policyVersion,awardedXp:entry.xp});
    }
   });
  });
 }};
}
