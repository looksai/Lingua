import {and,count,eq,lte} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {commercialReferralCodes as codes,commercialReferralAttributions as attributions,commercialReferralConversions as conversions,commercialCashEntries as cash} from "../drizzle/commercial-draft";
export async function readAdminReferralMetrics(db:MySql2Database,nowMs=Date.now()){
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid reporting time");
 return db.transaction(async tx=>{
 const [issued]=await tx.select({total:count()}).from(codes).where(lte(codes.issuedAtMs,nowMs));
 const [used]=await tx.select({total:count()}).from(attributions).where(lte(attributions.attributedAtMs,nowMs));
 const [confirmed]=await tx.select({total:count()}).from(conversions).innerJoin(cash,eq(cash.sourceKey,conversions.cashSourceKey)).where(and(eq(conversions.status,"confirmed"),eq(cash.kind,"subscription"),lte(cash.settledAtMs,nowMs),lte(conversions.convertedAtMs,nowMs)));
 const [reversed]=await tx.select({total:count()}).from(conversions).where(and(eq(conversions.status,"reversed"),lte(conversions.convertedAtMs,nowMs)));
 return {asOfMs:nowMs,codesIssued:issued.total,attributions:used.total,confirmedConversions:confirmed.total,reversedConversions:reversed.total};
 });
}
