import {describe,it,expect} from "vitest";
import {advanceIntegrated,integratedStage,INTEGRATED_STAGES,type IntegratedSession} from "../shared/exam-integrated-contract";
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
