import {describe,expect,it} from "vitest";
import {writingTasks,reviewWriting} from "./exam-writing";
import {countWritingWords} from "../shared/exam-writing-contract";
describe("IELTS Writing practice",()=>{
 it("provides six tasks per variant with original visual data for Academic task 1",()=>{
  for(const variant of ["ielts-academic","ielts-general"] as const){
   const tasks=writingTasks(variant);
   expect(tasks.map(t=>[t.kind,t.minimumWords,t.recommendedMinutes])).toEqual([[1,150,20],[2,250,40],[1,150,20],[2,250,40],[1,150,20],[2,250,40]]);
   expect(tasks.every(t=>t.variant===variant)).toBe(true);
   expect(tasks.filter(t=>t.kind===1).every(t=>Boolean(t.table)===(variant==="ielts-academic"))).toBe(true);
   expect(new Set(tasks.map(t=>t.id)).size).toBe(6);
  }
 });
 it("counts words consistently without treating length as proficiency",()=>{
  expect(countWritingWords("  I don't write state-of-the-art software.  ")).toBe(5);
  expect(countWritingWords("... !!")).toBe(0);
  const result=reviewWriting("academic-1-library",Array(150).fill("word").join(" "));
  expect(result?.minimumMet).toBe(true);
  expect(result?.wordCount).toBe(150);
  expect(result?.criteria).toHaveLength(4);
  expect(result?.assessment).toBe("self-review-only");
  expect(result).not.toHaveProperty("band");
  expect(reviewWriting("general-2-learning","One sentence.")?.minimumMet).toBe(false);
  expect(reviewWriting("unknown","text")).toBeNull();
 });
});
