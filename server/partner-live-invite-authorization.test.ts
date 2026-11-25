import {describe,it,expect} from "vitest";
import {canIssueLiveInvite,canRevokeLiveInvite,type LivePartnerMembership} from "./partner-live-invite-authorization";
import type {PartnerLiveEvent,PartnerLiveInvite} from "./partner-live-access";
const event:PartnerLiveEvent={id:"e1",partnerId:"p1",visibility:"public",status:"published"};
const invite:PartnerLiveInvite={eventId:"e1",partnerId:"p1",revokedAt:null,expiresAt:null};
const owner:LivePartnerMembership={partnerId:"p1",active:true,role:"owner"};
describe("partner invite management",()=>{
 it.each(["owner","event_manager"] as const)("allows active %s for own event",role=>{
  expect(canIssueLiveInvite({...owner,role},event)).toBe(true);
  expect(canRevokeLiveInvite({...owner,role},event,invite)).toBe(true);
 });
 it("denies inactive, absent, viewer and foreign memberships",()=>{
  for(const membership of [null,{...owner,active:false},{...owner,role:"viewer" as const},{...owner,partnerId:"p2"}]){
   expect(canIssueLiveInvite(membership,event)).toBe(false);
   expect(canRevokeLiveInvite(membership,event,invite)).toBe(false);
  }
 });
 it("issues only for public published or live events",()=>{
  expect(canIssueLiveInvite(owner,{...event,status:"live"})).toBe(true);
  for(const status of ["draft","ended","cancelled"] as const)expect(canIssueLiveInvite(owner,{...event,status})).toBe(false);
  for(const visibility of ["private","subscriber"] as const)expect(canIssueLiveInvite(owner,{...event,visibility})).toBe(false);
 });
 it("allows revocation after cancellation or visibility changes",()=>{
  expect(canRevokeLiveInvite(owner,{...event,status:"cancelled",visibility:"private"},invite)).toBe(true);
 });
 it("denies missing or mismatched event and invite records",()=>{
  expect(canIssueLiveInvite(owner,null)).toBe(false);
  expect(canRevokeLiveInvite(owner,null,invite)).toBe(false);
  expect(canRevokeLiveInvite(owner,event,null)).toBe(false);
  expect(canRevokeLiveInvite(owner,event,{...invite,eventId:"e2"})).toBe(false);
  expect(canRevokeLiveInvite(owner,event,{...invite,partnerId:"p2"})).toBe(false);
 });
});
