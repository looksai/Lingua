import {describe,it,expect} from "vitest";
import {writingTasks} from "./exam-writing";
import {writingSequence,reviewWritingSequence,WRITING_SEQUENCE_MS} from "../shared/exam-writing-sequence";
describe("Local two-task Writing sequence",()=>{
 it.each(["ielts-academic","ielts-general"] as const)("selects ordered tasks for %s",variant=>{
  const tasks=writingTasks(variant);const sequence=writingSequence([...tasks].reverse());
  expect(sequence.map(t=>t.kind)).toEqual([1,2]);
  expect(sequence.every(t=>t.variant===variant)).toBe(true);
  expect(WRITING_SEQUENCE_MS).toBe(60*60*1000);
  const result=reviewWritingSequence(tasks,{[sequence[0]!.id]:"word ".repeat(150),[sequence[1]!.id]:"one two"});
  expect(result[0]).toMatchObject({words:150,minimumMet:true,assessment:"self-review-only"});
  expect(result[1]).toMatchObject({words:2,minimumMet:false,assessment:"self-review-only"});
 });
 it("does not fabricate missing or mixed-variant tasks",()=>{
  expect(writingSequence([])).toEqual([]);
  expect(writingSequence([writingTasks("ielts-academic")[0]!,writingTasks("ielts-general")[1]!])).toEqual([]);
 });
});
