import {and,gte,lt} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialCashEntries as cash} from "../drizzle/commercial-draft";
import {realizedCashReport} from "../shared/admin-finance-policy";
// Read-only laboratory report. Never silently truncate a financial total.
export async function readRealizedCashLab(db:MySql2Database,fromMs:number,toMs:number){
 realizedCashReport([],fromMs,toMs);
 if(toMs-fromMs>366*86400000)throw Error("Reporting period exceeds one year");
 const rows=await db.select({id:cash.sourceKey,currency:cash.currency,kind:cash.kind,minorUnits:cash.minorUnits,settledAtMs:cash.settledAtMs}).from(cash).where(and(gte(cash.settledAtMs,fromMs),lt(cash.settledAtMs,toMs))).limit(100001);
 if(rows.length>100000)throw Error("Reporting volume exceeds laboratory limit");
 return {fromMs,toMs,totals:realizedCashReport(rows,fromMs,toMs)};
}
