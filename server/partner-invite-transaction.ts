import {and,eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {partnersDraft as partners,partnerMembersDraft as members,partnerEventsDraft as events,partnerLiveInvitesDraft as invites} from "../drizzle/partner-foundation-draft";
import {deriveLiveMembership} from "./partner-membership-policy";
import {issueLiveInvite,revokeLiveInvite} from "./partner-live-invite-service";
const valid=(n:number)=>Number.isSafeInteger(n)&&n>0;
const eventRecord=(e:typeof events.$inferSelect)=>({id:String(e.id),partnerId:String(e.partnerId),visibility:e.visibility,status:e.status});
// Experimental repository: explicit database injection, no production wiring.
// All future partner mutations must acquire locks in partner/member/event/invite order.
export async function issuePartnerInvite(db:MySql2Database,userId:number,partnerId:number,eventId:number,expiresAt:number|null){
 if(![userId,partnerId,eventId].every(valid))return null;
 return db.transaction(async tx=>{
  const [partner]=await tx.select().from(partners).where(eq(partners.id,partnerId)).for("update");
  const [member]=await tx.select().from(members).where(and(eq(members.partnerId,partnerId),eq(members.userId,userId))).for("update");
  const [event]=await tx.select().from(events).where(and(eq(events.partnerId,partnerId),eq(events.id,eventId))).for("update");
  const issued=issueLiveInvite(deriveLiveMembership(userId,partner??null,member??null),event?eventRecord(event):null,Date.now(),expiresAt);
  if(!issued)return null;
  await tx.insert(invites).values({partnerId,eventId,digest:issued.record.digest,issuedByUserId:userId,expiresAt:expiresAt===null?null:new Date(expiresAt)});
  return {token:issued.token};
 });
}
export async function revokePartnerInvite(db:MySql2Database,userId:number,partnerId:number,eventId:number,digest:string){
 if(![userId,partnerId,eventId].every(valid)||!/^[a-f0-9]{64}$/.test(digest))return false;
 return db.transaction(async tx=>{
  const [partner]=await tx.select().from(partners).where(eq(partners.id,partnerId)).for("update");
  const [member]=await tx.select().from(members).where(and(eq(members.partnerId,partnerId),eq(members.userId,userId))).for("update");
  const [event]=await tx.select().from(events).where(and(eq(events.partnerId,partnerId),eq(events.id,eventId))).for("update");
  const [invite]=await tx.select().from(invites).where(and(eq(invites.partnerId,partnerId),eq(invites.eventId,eventId),eq(invites.digest,digest))).for("update");
  const record=invite?{digest:invite.digest,partnerId:String(invite.partnerId),eventId:String(invite.eventId),expiresAt:invite.expiresAt?.getTime()??null,revokedAt:invite.revokedAt?.getTime()??null}:null;
  const revoked=revokeLiveInvite(deriveLiveMembership(userId,partner??null,member??null),event?eventRecord(event):null,record,Date.now());
  if(!revoked||!invite)return false;
  if(invite.revokedAt===null&&revoked.revokedAt!==null)await tx.update(invites).set({revokedAt:new Date(revoked.revokedAt)}).where(eq(invites.id,invite.id));
  return true;
 });
}
