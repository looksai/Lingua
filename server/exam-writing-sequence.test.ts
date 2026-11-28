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
 it("keeps the three sets separate and reviews the selected tasks",()=>{
  const tasks=writingTasks("ielts-general");
  const all=(["set-1","set-2","set-3"] as const).flatMap(id=>writingSequence(tasks,id));
  expect(new Set(all.map(t=>t.id)).size).toBe(6);
  const pair=writingSequence(tasks,"set-3");
  expect(pair.map(t=>t.id)).toEqual(["general-1-manager","general-2-volunteering"]);
  expect(reviewWritingSequence(tasks,{[pair[0]!.id]:"one two"},"set-3")[0]).toMatchObject({taskId:pair[0]!.id,words:2});
  expect(writingSequence([...tasks,pair[0]!],"set-3")).toEqual([]);
 });
 it("does not fabricate missing or mixed-variant tasks",()=>{
  expect(writingSequence([])).toEqual([]);
  expect(writingSequence([writingTasks("ielts-academic")[0]!,writingTasks("ielts-general")[1]!])).toEqual([]);
 });
});
