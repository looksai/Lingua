import {LiveInviteStoreLab} from "./partner-live-invite-store-lab";
import {issueLiveInvite,revokeLiveInvite,resolveLiveInvite} from "./partner-live-invite-service";
import {digestLiveInviteToken} from "./partner-live-invite-token";
import type {PartnerLiveEvent} from "./partner-live-access";
import type {LivePartnerMembership} from "./partner-live-invite-authorization";
// Isolated synchronous laboratory. Inputs must eventually come from authoritative server records.
export class LiveInviteIntegratedLab {
 constructor(private readonly store=new LiveInviteStoreLab()){}
 issue(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null,now:number,expiresAt:number|null){
  const issued=issueLiveInvite(membership,event,now,expiresAt);
  if(!issued||!this.store.insert(issued.record))return null;
  return {token:issued.token,digest:issued.record.digest};
 }
 resolve(token:string,event:PartnerLiveEvent|null,now:number){
  const digest=digestLiveInviteToken(token);
  return digest?resolveLiveInvite(token,event,this.store.find(digest),now):null;
 }
 revoke(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null,digest:string,now:number):boolean{
  const revoked=revokeLiveInvite(membership,event,this.store.find(digest),now);
  return !!revoked&&this.store.revoke(digest,revoked.partnerId,revoked.eventId,now);
 }
}
