import type {LivePartnerMembership} from "./partner-live-invite-authorization";
export type PartnerRecord={id:number;status:"pending"|"active"|"suspended"};
export type PartnerMemberRecord={partnerId:number;userId:number;role:"owner"|"event_manager"|"viewer";status:"active"|"inactive"};
const validId=(id:number)=>Number.isSafeInteger(id)&&id>0;
// All records must originate from the server-side repository, never request bodies.
export function deriveLiveMembership(userId:number,partner:PartnerRecord|null,member:PartnerMemberRecord|null):LivePartnerMembership|null {
 if(!validId(userId)||!partner||!member||!validId(partner.id)||partner.status!=="active"||member.status!=="active"||member.userId!==userId||member.partnerId!==partner.id)return null;
 if(!["owner","event_manager","viewer"].includes(member.role))return null;
 return {partnerId:String(partner.id),active:true,role:member.role};
}
