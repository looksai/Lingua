import {and,eq,gt,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialRecurringContracts as contracts} from "../drizzle/commercial-draft";
import {contractedMrr,type RecurringContract} from "../shared/admin-recurring-revenue";
export async function readContractedMrrLab(db:MySql2Database,nowMs=Date.now()){
 contractedMrr([],nowMs);
 const rows=await db.select({id:contracts.sourceKey,currency:contracts.currency,amountMinor:contracts.amountMinor,intervalMonths:contracts.intervalMonths,status:contracts.status,startsAtMs:contracts.startsAtMs,endsAtMs:contracts.endsAtMs}).from(contracts).where(and(eq(contracts.status,"active"),lte(contracts.startsAtMs,nowMs),gt(contracts.endsAtMs,nowMs))).limit(100001);
 if(rows.length>100000)throw Error("Recurring reporting volume exceeds laboratory limit");
 const validated:RecurringContract[]=rows.map(row=>{
 if(row.intervalMonths!==1&&row.intervalMonths!==12)throw Error("Invalid billing interval");
 return {...row,intervalMonths:row.intervalMonths};
 });
 return {asOfMs:nowMs,totals:contractedMrr(validated,nowMs)};
}
