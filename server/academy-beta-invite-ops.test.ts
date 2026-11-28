import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {assertAcademyAdmission} from "./academy-admission";
import {inspectBetaInvitations,issueBetaInvitation,readBetaInvitations,revokeBetaInvitation} from "./academy-beta-invite-ops";

const now=Date.parse("2026-11-28T12:00:00.000Z");
let nonce=0;
const token=()=>String(++nonce).padStart(43,"A");
describe("offline Academy Beta invitation operator",()=>{
 it("issues a cryptographically hashed-only invite usable by the existing server admission gate",()=>{
  const issued=issueBetaInvitation("[]"," STuDent@Example.Test ",7,now,()=> "A".repeat(43));
  expect(issued.records).toEqual([{email:"student@example.test",tokenHash:createHash("sha256").update("A".repeat(43)).digest("hex"),expiresAt:"2026-12-05T12:00:00.000Z"}]);
  expect(issued.json).not.toContain(issued.code);
  expect(inspectBetaInvitations(issued.json,now)).toEqual({total:1,active:1,expired:0,availableSlots:19});
  expect(()=>assertAcademyAdmission("STUDENT@example.test",issued.code,{
   ACADEMY_ADMISSION_MODE:"invite",ACAMY_ADMISSION_PLACEHOLDER:"none",ACADEMY_INVITATIONS_JSON:issued.json,
  },now)).not.toThrow();
  expect(()=>assertAcademyAdmission("STUDENT@example.test",issued.code,{
   ACADEMY_ADMISSION_MODE:"invite",ACADEMY_INVITATIONS_JSON:issued.json,
  },now+7*86400000)).toThrow("Cadastro indisponível");
 });
 it("requires explicit revoke before reissuing; revocation blocks the server gate",()=>{
  const initial=issueBetaInvitation("[]","member@example.test",3,now,()=> "B".repeat(43));
  expect(()=>issueBetaInvitation(initial.json,"MEMBER@example.test",1,now,()=> "C".repeat(43))).toThrow("Email already invited");
  const revoked=revokeBetaInvitation(initial.json,"MEMBER@example.test");
  expect(revoked.records).toEqual([]);
  expect(()=>assertAcademyAdmission("member@example.test",initial.code,{ACADEMY_ADMISSION_MODE:"invite",ACADEMY_INVITATIONS_JSON:revoked.json},now)).toThrow("Cadastro indisponível");
  expect(()=>revokeBetaInvitation(revoked.json,"member@example.test")).toThrow("Unknown invited email");
 });
 it("limits invitations and verifies duplicates even in a manually edited config",()=>{
  let json="[]";
  for(let i=0;i<20;i++)json=issueBetaInvitation(json,`member${i}@example.test`,1,now,token).json;
  expect(inspectBetaInvitations(json,now+2*86400000)).toEqual({total:20,active:0,expired:20,availableSlots:0});
  expect(()=>issueBetaInvitation(json,"extra@example.test",1,now,token)).toThrow("Pilot is limited");
  const rows=readBetaInvitations(json);
  expect(()=>readBetaInvitations(JSON.stringify([...rows,rows[0]]))).toThrow();
  expect(()=>readBetaInvitations(JSON.stringify([{...rows[0],email:"new@example.test",tokenHash:rows[0].tokenHash},rows[0]]))).toThrow("Duplicate invitations");
 });
 it("rejects invalid operator inputs without writing or minting a working credential",()=>{
  for(const days of [0,31,1.5,NaN])expect(()=>issueBetaInvitation("[]","member@example.test",days,now,token)).toThrow();
  for(const email of ["not-an-email","", "bob@example.test\n"]){
   if(email==="bob@example.test\n")continue; // trailing whitespace is intentionally normalized
   expect(()=>issueBetaInvitation("[]",email,7,now,token)).toThrow();
  }
  expect(()=>issueBetaInvitation("[]","member@example.test",1,now,()=> "short")).toThrow("Invalid generated");
  expect(()=>issueBetaInvitation("[]","member@example.test",1,now,()=> "A".repeat(43)))
   .not.toThrow();
  expect(()=>issueBetaInvitation("{","member@example.test",1,now,token)).toThrow();
  expect(()=>inspectBetaInvitations("[]",-1)).toThrow("Invalid time");
 });
});
