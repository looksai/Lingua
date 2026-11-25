import {and,eq,desc} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {partnersDraft as partners,partnerMembersDraft as members,partnerEventsDraft as events} from "../drizzle/partner-foundation-draft";
import {deriveLiveMembership} from "./partner-membership-policy";
import {canTransitionEvent,validEventSchedule,validEventTitle,type EventStatus,type EventVisibility} from "./partner-event-policy";
const valid=(id:number)=>Number.isSafeInteger(id)&&id>0&&id<=2147483647;
export async function listPartnerEvents(db:MySql2Database,userId:number,partnerId:number){
 if(![userId,partnerId].every(valid))return null;
 return db.transaction(async tx=>{
  const [p]=await tx.select().from(partners).where(eq(partners.id,partnerId)).for("update");
  const [m]=await tx.select().from(members).where(and(eq(members.partnerId,partnerId),eq(members.userId,userId))).for("update");
  if(!deriveLiveMembership(userId,p??null,m??null))return null;
  return tx.select({id:events.id,title:events.title,visibility:events.visibility,status:events.status,scheduledAt:events.scheduledAt}).from(events).where(eq(events.partnerId,partnerId)).orderBy(desc(events.scheduledAt),desc(events.id)).limit(100);
 });
}
export async function createPartnerEvent(db:MySql2Database,userId:number,partnerId:number,input:{title:string;visibility:EventVisibility;scheduledAt:number}){
 if(![userId,partnerId].every(valid)||!validEventTitle(input.title)||!validEventSchedule(input.scheduledAt)||!["public","private","subscriber"].includes(input.visibility))return null;
 return db.transaction(async tx=>{
  const [p]=await tx.select().from(partners).where(eq(partners.id,partnerId)).for("update");
  const [m]=await tx.select().from(members).where(and(eq(members.partnerId,partnerId),eq(members.userId,userId))).for("update");
  const membership=deriveLiveMembership(userId,p??null,m??null);
  if(!membership||membership.role==="viewer")return null;
  const [result]=await tx.insert(events).values({partnerId,title:input.title.trim(),visibility:input.visibility,status:"draft",scheduledAt:new Date(input.scheduledAt)}).$returningId();
  return result??null;
 });
}
export async function transitionPartnerEvent(db:MySql2Database,userId:number,partnerId:number,eventId:number,to:EventStatus){
 if(![userId,partnerId,eventId].every(valid))return false;
 return db.transaction(async tx=>{
  const [p]=await tx.select().from(partners).where(eq(partners.id,partnerId)).for("update");
  const [m]=await tx.select().from(members).where(and(eq(members.partnerId,partnerId),eq(members.userId,userId))).for("update");
  const membership=deriveLiveMembership(userId,p??null,m??null);
  if(!membership||membership.role==="viewer")return false;
  const [event]=await tx.select().from(events).where(and(eq(events.partnerId,partnerId),eq(events.id,eventId))).for("update");
  if(!event||!canTransitionEvent(event.status,to))return false;
  await tx.update(events).set({status:to}).where(and(eq(events.partnerId,partnerId),eq(events.id,eventId)));
  return true;
 });
}
