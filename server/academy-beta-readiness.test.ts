import {describe,expect,it} from "vitest";
import {issueBetaInvitation,revokeBetaInvitation} from "./academy-beta-invite-ops";
import {inspectAcademyBetaReadiness} from "./academy-beta-readiness";

const now=Date.parse("2026-11-28T12:00:00.000Z");
const issued=issueBetaInvitation("[]","synthetic@example.test",7,now,()=> "A".repeat(43));
const readyConfig={
 ACADEMY_ADMISSION_MODE:"invite",
 ACADEMY_TRIAL_ENABLED:"true",
 ACADEMY_INVITATIONS_JSON:issued.json,
 SESSION_SECRET:"x".repeat(48),
 DATABASE_URL:"mysql://synthetic.example.invalid/demo",
};
describe("Academy Beta staging readiness is redacted and fail-closed",()=>{
 it("accepts a bounded invite-only pilot but explicitly flags the distributed limit gate",()=>{
  const status=inspectAcademyBetaReadiness(readyConfig,now);
  expect(status).toEqual({ready:true,activeInvitations:1,totalInvitations:1,expiredInvitations:0,issues:[{code:"shared_signup_rate_limit_required_before_public_launch",severity:"warning"}]});
  const output=JSON.stringify(status);
  expect(output).not.toContain("synthetic@example.test");
  expect(output).not.toContain("mysql://");
  expect(output).not.toContain("A".repeat(43));
 });
 it("rejects unintended open or closed admission, missing trial and unsafe secrets",()=>{
  for(const key of ["ACADEMY_ADMISSION_MODE","ACADEMY_TRIAL_ENABLED","SESSION_SECRET","DATABASE_URL"] as const){
   const config={...readyConfig,[key]:undefined};
   expect(inspectAcademyBetaReadiness(config,now).ready).toBe(false);
  }
  expect(inspectAcademyBetaReadiness({...readyConfig,ACADEMY_ADMISSION_MODE:"open"},now).issues.some(x=>x.code==="admission_not_invite_only")).toBe(true);
 });
 it("rejects an expired, malformed or removed invitation set without revealing identity",()=>{
  for(const value of ["{","[]",revokeBetaInvitation(issued.json,"synthetic@example.test").json]){
   const status=inspectAcademyBetaReadiness({...readyConfig,ACADEMY_INVITATIONS_JSON:value},now);
   expect(status.ready).toBe(false);
  }
  const expired=inspectAcademyBetaReadiness({...readyConfig,ACADEMY_INVITATIONS_JSON:issued.json},now+8*86400000);
  expect(expired.ready).toBe(false);
  expect(expired.issues.map(x=>x.code)).toContain("expired_invites_consume_pilot_slots");
 });
 it("does not accept missing or malformed invitation metadata even with a correct mode",()=>{
  expect(inspectAcademyBetaReadiness({...readyConfig,ACADEMY_INVITATIONS_JSON:undefined},now).issues).toContainEqual({code:"invitation_config_invalid",severity:"blocker"});
  expect(()=>inspectAcademyBetaReadiness(readyConfig,-1)).toThrow("Invalid preflight time");
 });
});
