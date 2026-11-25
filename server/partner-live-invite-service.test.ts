import {describe,it,expect} from "vitest";
import {issueLiveInvite,revokeLiveInvite,resolveLiveInvite} from "./partner-live-invite-service";
import type {PartnerLiveEvent} from "./partner-live-access";
import type {LivePartnerMembership} from "./partner-live-invite-authorization";
const event:PartnerLiveEvent={id:"e1",partnerId:"p1",visibility:"public",status:"published"};
const owner:LivePartnerMembership={partnerId:"p1",active:true,role:"owner"};
describe("live invite lifecycle",()=>{
 it("issues a digest-only record and resolves landing then playback",()=>{
  const issued=issueLiveInvite(owner,event,100,200)!;
  expect(issued).not.toBeNull();
  expect(JSON.stringify(issued.record)).not.toContain(issued.token);
  expect(resolveLiveInvite(issued.token,event,issued.record,101)).toEqual({eventId:"e1",canWatch:false});
  expect(resolveLiveInvite(issued.token,{...event,status:"live"},issued.record,102)).toEqual({eventId:"e1",canWatch:true});
 });
 it("rejects unauthorized issuance and invalid expiry",()=>{
  expect(issueLiveInvite({...owner,partnerId:"p2"},event,100,200)).toBeNull();
  expect(issueLiveInvite(owner,event,100,100)).toBeNull();
  expect(issueLiveInvite(owner,event,100,Infinity)).toBeNull();
  expect(issueLiveInvite(owner,event,NaN,null)).toBeNull();
 });
 it("revokes idempotently and denies subsequent access",()=>{
  const issued=issueLiveInvite(owner,event,100,null)!;
  const revoked=revokeLiveInvite(owner,event,issued.record,110)!;
  expect(revoked.revokedAt).toBe(110);
  expect(revokeLiveInvite(owner,event,revoked,120)).toEqual(revoked);
  expect(resolveLiveInvite(issued.token,event,revoked,120)).toBeNull();
  expect(revokeLiveInvite({...owner,partnerId:"p2"},event,issued.record,110)).toBeNull();
 });
 it("rejects wrong tokens, records, expiry and changed event state",()=>{
  const a=issueLiveInvite(owner,event,100,200)!;
  const b=issueLiveInvite(owner,event,100,200)!;
  expect(resolveLiveInvite(a.token,event,b.record,101)).toBeNull();
  expect(resolveLiveInvite("invalid",event,a.record,101)).toBeNull();
  expect(resolveLiveInvite(a.token,event,a.record,200)).toBeNull();
  expect(resolveLiveInvite(a.token,{...event,visibility:"private"},a.record,101)).toBeNull();
  expect(resolveLiveInvite(a.token,{...event,status:"cancelled"},a.record,101)).toBeNull();
  expect(resolveLiveInvite(a.token,{...event,id:"e2"},a.record,101)).toBeNull();
 });
});
