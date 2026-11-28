import {and,count,eq,gt,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialAdOrders as ads,commercialCashEntries as cash} from "../drizzle/commercial-draft";
export async function readAdminAdMetrics(db:MySql2Database,nowMs=Date.now()){
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid reporting time");
 return db.transaction(async tx=>{
 const [total]=await tx.select({total:count()}).from(ads);
 const paidEvidence=and(eq(ads.paymentStatus,"paid"),eq(cash.kind,"advertising"),eq(cash.currency,ads.currency),eq(cash.minorUnits,ads.amountMinor),lte(cash.settledAtMs,nowMs));
 const [paid]=await tx.select({total:count()}).from(ads).innerJoin(cash,eq(cash.sourceKey,ads.cashSourceKey)).where(paidEvidence);
 const [active]=await tx.select({total:count()}).from(ads).innerJoin(cash,eq(cash.sourceKey,ads.cashSourceKey)).where(and(paidEvidence,eq(ads.deliveryStatus,"active"),lte(ads.startsAtMs,nowMs),gt(ads.endsAtMs,nowMs)));
 return {asOfMs:nowMs,totalOrders:total.total,paidOrders:paid.total,activePaidOrders:active.total};
 });
}
