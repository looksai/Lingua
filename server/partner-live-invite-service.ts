import {canOpenPublicLive,canWatchPublicLive,type PartnerLiveEvent,type PartnerLiveInvite} from "./partner-live-access";
import {canIssueLiveInvite,canRevokeLiveInvite,type LivePartnerMembership} from "./partner-live-invite-authorization";
import {createLiveInviteToken,digestLiveInviteToken} from "./partner-live-invite-token";
export type StoredLiveInvite=PartnerLiveInvite&Readonly<{digest:string}>;
 // Pure domain operations. Persistence must atomically enforce unique digest and recheck authoritative authorization.
export function issueLiveInvite(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null,now:number,expiresAt:number|null):{token:string;record:StoredLiveInvite}|null{
 if(!event||!canIssueLiveInvite(membership,event)||!Number.isFinite(now))return null;
 if(expiresAt!==null&&(!Number.isFinite(expiresAt)||expiresAt<=now))return null;
 const {token,digest}=createLiveInviteToken();
 return {token,record:{digest,eventId:event.id,partnerId:event.partnerId,revokedAt:null,expiresAt}};
}
export function revokeLiveInvite(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null,record:StoredLiveInvite|null,now:number):StoredLiveInvite|null{
 if(!record||!Number.isFinite(now)||!canRevokeLiveInvite(membership,event,record))return null;
 return record.revokedAt!==null?record:{...record,revokedAt:now};
}
export function resolveLiveInvite(token:string,event:PartnerLiveEvent|null,record:StoredLiveInvite|null,now:number):{eventId:string;canWatch:boolean}|null{
 const digest=digestLiveInviteToken(token);
 if(!digest||!record||record.digest!==digest||!event||!canOpenPublicLive(event,record,now))return null;
 return {eventId:event.id,canWatch:canWatchPublicLive(event,record,now)};
}
