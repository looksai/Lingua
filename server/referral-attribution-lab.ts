import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {users} from "../drizzle/schema";
import {commercialReferralCodes as codes,commercialReferralAttributions as attributions} from "../drizzle/commercial-draft";
// Caller supplies authenticated owner; no public route.
export async function attributeReferralLab(db:MySql2Database,userId:number,code:string,clock=Date.now){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||!/^[A-Z0-9_-]{4,40}$/.test(code))throw Error("Invalid referral");
 return db.transaction(async tx=>{
 const [owner]=await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for("update");
 if(!owner)throw Error("Invalid owner");
 const [existing]=await tx.select({id:attributions.id}).from(attributions).where(eq(attributions.referredUserId,userId)).limit(1);
 if(existing)return {status:"already-attributed" as const};
 const [referral]=await tx.select().from(codes).where(eq(codes.code,code)).for("update");
 const now=clock();
 if(!Number.isSafeInteger(now)||now<0||!referral||referral.referrerId===userId||referral.revokedAtMs!==null||referral.issuedAtMs>now||referral.expiresAtMs<=now||!Number.isInteger(referral.commissionBasisPoints)||referral.commissionBasisPoints<0||referral.commissionBasisPoints>10000)throw Error("Referral unavailable");
 await tx.insert(attributions).values({codeId:referral.id,referredUserId:userId,attributedAtMs:now,commissionBasisPoints:referral.commissionBasisPoints});
 return {status:"attributed" as const};
 });
}
