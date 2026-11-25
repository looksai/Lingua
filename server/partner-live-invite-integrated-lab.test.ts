import {describe,it,expect} from "vitest";
import {LiveInviteIntegratedLab} from "./partner-live-invite-integrated-lab";
import {LiveInviteStoreLab} from "./partner-live-invite-store-lab";
import type {PartnerLiveEvent} from "./partner-live-access";
import type {LivePartnerMembership} from "./partner-live-invite-authorization";
const event:PartnerLiveEvent={id:"e1",partnerId:"p1",visibility:"public",status:"live"};
const owner:LivePartnerMembership={partnerId:"p1",active:true,role:"owner"};
describe("integrated invite laboratory",()=>{
 it("issues, resolves and revokes through storage",()=>{
  const lab=new LiveInviteIntegratedLab();
  const issued=lab.issue(owner,event,100,200)!;
  expect(lab.resolve(issued.token,event,101)).toEqual({eventId:"e1",canWatch:true});
  expect(lab.revoke({...owner,partnerId:"p2"},event,issued.digest,102)).toBe(false);
  expect(lab.resolve(issued.token,event,103)?.canWatch).toBe(true);
  expect(lab.revoke(owner,event,issued.digest,104)).toBe(true);
  expect(lab.resolve(issued.token,event,105)).toBeNull();
 });
 it("fails closed when storage is full or authorization is absent",()=>{
  const lab=new LiveInviteIntegratedLab(new LiveInviteStoreLab(1));
  expect(lab.issue(null,event,100,null)).toBeNull();
  expect(lab.issue(owner,event,100,null)).not.toBeNull();
  expect(lab.issue(owner,event,100,null)).toBeNull();
 });
 it("checks current event visibility and expiration on every resolution",()=>{
  const lab=new LiveInviteIntegratedLab();
  const issued=lab.issue(owner,event,100,200)!;
  expect(lab.resolve(issued.token,{...event,visibility:"private"},101)).toBeNull();
  expect(lab.resolve(issued.token,{...event,partnerId:"p2"},101)).toBeNull();
  expect(lab.resolve(issued.token,event,200)).toBeNull();
 });
});
