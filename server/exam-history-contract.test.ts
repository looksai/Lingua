import {describe,expect,it} from "vitest";
import {examGoalInput,completedExamActivity} from "../shared/exam-history-contract";
describe("Exam history input boundaries",()=>{
 it("accepts a target, not a measured band, with a calendar date",()=>{
  const goal={variant:"ielts-academic",targetBandHalfSteps:13,targetDate:"2027-02-28"};
  expect(examGoalInput.safeParse(goal).success).toBe(true);
  expect(examGoalInput.safeParse({...goal,targetDate:"2027-02-30"}).success).toBe(false);
  expect(examGoalInput.safeParse({...goal,targetBandHalfSteps:13.5}).success).toBe(false);
  expect(examGoalInput.safeParse({...goal,userId:1}).success).toBe(false);
 });
 it("accepts objective metadata only, with bounded counts",()=>{
  const row={attemptId:"00000000-0000-4000-8000-000000000001",variant:"ielts-academic",skill:"reading",mode:"practice",exerciseId:"qa",contentVersion:"v1",correct:3,total:4,completedAtMs:1000};
  expect(completedExamActivity.safeParse(row).success).toBe(true);
  expect(completedExamActivity.safeParse({...row,correct:5}).success).toBe(false);
  expect(completedExamActivity.safeParse({...row,skill:"listening",mode:"timed"}).success).toBe(false);
  expect(completedExamActivity.safeParse({...row,redaction:"personal data"}).success).toBe(false);
 });
});
