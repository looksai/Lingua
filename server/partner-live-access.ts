// Pure policy only: no routes, persistence, streaming or billing.
// Caller must load authoritative event and invitation records server-side.
export type PartnerLiveEvent = Readonly<{
  id:string; partnerId:string;
  visibility:"public"|"private"|"subscriber";
  status:"draft"|"published"|"live"|"ended"|"cancelled";
}>;
export type PartnerLiveInvite = Readonly<{
  eventId:string; partnerId:string; revokedAt:number|null;
  expiresAt:number|null;
}>;
export function canOpenPublicLive(event:PartnerLiveEvent|null,invite:PartnerLiveInvite|null,now:number):boolean {
  if(!event||!invite||!Number.isFinite(now))return false;
  if(!event.id||!event.partnerId||invite.eventId!==event.id||invite.partnerId!==event.partnerId)return false;
  if(event.visibility!=="public"||(event.status!=="published"&&event.status!=="live"))return false;
  if(invite.revokedAt!==null)return false;
  if(invite.expiresAt!==null&&(!Number.isFinite(invite.expiresAt)||now>=invite.expiresAt))return false;
  return true;
}
export function canWatchPublicLive(event:PartnerLiveEvent|null,invite:PartnerLiveInvite|null,now:number):boolean {
  return event?.status==="live"&&canOpenPublicLive(event,invite,now);
}
