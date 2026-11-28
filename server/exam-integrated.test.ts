import {describe,it,expect} from "vitest";
import {advanceIntegrated,integratedReport,integratedStage,INTEGRATED_STAGES,type IntegratedSession} from "../shared/exam-integrated-contract";
describe("Integrated practice progression",()=>{
 for(const variant of ["ielts-academic","ielts-general"] as const){
  it("preserves variant and ordered outcomes for "+variant,()=>{
   let session:IntegratedSession={variant,outcomes:[]};
   for(const stage of INTEGRATED_STAGES){
    expect(integratedStage(session)).toBe(stage);
    const previous=session;
    session=advanceIntegrated(session,{stage,status:stage==="reading"?"expired":"completed"});
    expect(session.variant).toBe(variant);
    expect(previous.outcomes.length).toBe(session.outcomes.length-1);
   }
   expect(integratedStage(session)).toBeNull();
   expect(()=>advanceIntegrated(session,{stage:"speaking",status:"completed"})).toThrow();
  });
 }
 it("rejects out-of-order or repeated stages",()=>{
  const session:IntegratedSession={variant:"ielts-academic",outcomes:[]};
  expect(()=>advanceIntegrated(session,{stage:"reading",status:"completed"})).toThrow();
  const next=advanceIntegrated(session,{stage:"listening",status:"skipped"});
  expect(()=>advanceIntegrated(next,{stage:"listening",status:"completed"})).toThrow();
 });
});

describe("Integrated report",()=>{
 it("retains objective scores and distinguishes incomplete stages",()=>{
  let session:IntegratedSession={variant:"ielts-general",outcomes:[]};
  session=advanceIntegrated(session,{stage:"listening",status:"completed",objective:{correct:9,total:12}});
  session=advanceIntegrated(session,{stage:"reading",status:"expired"});
  session=advanceIntegrated(session,{stage:"writing",status:"skipped"});
  expect(integratedReport(session)).toMatchObject({finished:false,completed:1,stages:[{stage:"listening",status:"completed",objective:{correct:9,total:12}},{stage:"reading",status:"expired"},{stage:"writing",status:"skipped"},{stage:"speaking",status:"pending"}]});
  session=advanceIntegrated(session,{stage:"speaking",status:"completed"});
  expect(integratedReport(session)).toMatchObject({finished:true,completed:2});
  expect(integratedReport(session).stages[3].objective).toBeUndefined();
  expect(integratedReport({variant:"ielts-academic",outcomes:[]})).toMatchObject({finished:false,completed:0});
 });
});
