import type {PartnerLiveEvent,PartnerLiveInvite} from "./partner-live-access";
// Membership must be obtained from trusted server-side authorization, never request input.
export type LivePartnerMembership=Readonly<{partnerId:string;active:boolean;role:"owner"|"event_manager"|"viewer"}>;
function manages(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null):boolean{
  return !!membership&&!!event&&!!event.id&&!!event.partnerId&&membership.active===true&&membership.partnerId===event.partnerId&&(membership.role==="owner"||membership.role==="event_manager");
}
export function canIssueLiveInvite(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null):boolean{
  return manages(membership,event)&&event?.visibility==="public"&&(event.status==="published"||event.status==="live");
}
export function canRevokeLiveInvite(membership:LivePartnerMembership|null,event:PartnerLiveEvent|null,invite:PartnerLiveInvite|null):boolean{
  return manages(membership,event)&&!!event&&!!invite&&invite.partnerId===event.partnerId&&invite.eventId===event.id;
}
