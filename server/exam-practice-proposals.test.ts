import {describe,it,expect} from "vitest";
import {proposeExamPractice,examProposalsEnabled} from "./exam-practice-proposals";
import {examExercises} from "./exam-engine";
import {IELTS_ADAPTER_VERSION} from "../shared/exam-contract";
import type {CompletedExamActivity} from "../shared/exam-history-contract";
const variant="ielts-academic" as const;
const sets=examExercises(variant,"reading");
function row(exerciseId:string,i:number,correct=4):CompletedExamActivity{
 return {attemptId:"00000000-0000-4000-8000-"+String(i).padStart(12,"0"),variant,skill:"reading",exerciseId,contentVersion:IELTS_ADAPTER_VERSION,mode:"practice",correct,total:4,completedAtMs:1000+i};
}
describe("Exam practice proposals (local baseline)",()=>{
 it("defaults off and recommends exploration when nothing observed",()=>{
  expect(examProposalsEnabled({})).toBe(false);
  expect(proposeExamPractice(variant,[]).map(p=>p.reason)).toEqual(["explore-unsampled","explore-unsampled"]);
 });
 it("filters stale content, timed mode, invalid rows and other variants",()=>{
  const a=row(sets[0]!.id,1);
  const result=proposeExamPractice(variant,[{...a,contentVersion:"old"},{...a,variant:"ielts-general"},{...a,mode:"timed"},{...a,correct:5}]);
  expect(result[0]?.observedDistinctSets).toBe(0);
 });
 it("counts distinct contexts rather than repetitions and suggests unseen content first",()=>{
  const a=row(sets[0]!.id,1,0);
  const result=proposeExamPractice(variant,[a,row(sets[0]!.id,2,4)]);
  expect(result[0]).toMatchObject({exerciseId:sets[1]!.id,reason:"practice-more-contexts",observedDistinctSets:1,authority:"practice-only"});
 });
 it("when all sets observed, targets missed items using only latest attempt per set",()=>{
  const all=sets.map((s,i)=>row(s.id,i+1,i===1?2:4));
  const p=proposeExamPractice(variant,[...all,row(sets[0]!.id,99,4),row(sets[0]!.id,10,0)])[0];
  expect(p).toMatchObject({exerciseId:sets[1]!.id,reason:"review-missed-items",source:"lingua-local-rule"});
  const varied=proposeExamPractice(variant,sets.map((s,i)=>row(s.id,i+1)))[0];
  expect(varied?.reason).toBe("vary-practice");
 });
});
