import {describe,it,expect} from "vitest";
import {examRetentionCutoffs,EXAM_RETENTION_DAYS,EXAM_EXPIRED_ATTEMPT_GRACE_MS} from "../shared/exam-retention";
describe("Exam retention policy candidate",()=>{
 it("uses exact elapsed UTC days, not local timezone or calendar arithmetic",()=>{
  const now=Date.parse("2027-11-28T12:00:00Z");
  expect(EXAM_RETENTION_DAYS).toBe(365);
  expect(examRetentionCutoffs(now)).toEqual({history:now-365*86400000,attempt:now-EXAM_EXPIRED_ATTEMPT_GRACE_MS});
 });
 it.each([NaN,Infinity,-1,0,1.5,8640000000000001])("rejects invalid clock %s",now=>expect(()=>examRetentionCutoffs(now)).toThrow());
});
