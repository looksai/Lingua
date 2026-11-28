import {describe,it,expect} from "vitest";
import {SPEAKING_PROMPTS,SPEAKING_CRITERIA} from "../shared/exam-speaking-contract";
describe("Speaking practice content",()=>{
 it("provides six unique original activities across all three parts",()=>{
  expect(SPEAKING_PROMPTS).toHaveLength(6);
  expect(new Set(SPEAKING_PROMPTS.map(p=>p.id)).size).toBe(6);
  for(const part of [1,2,3])expect(SPEAKING_PROMPTS.filter(p=>p.part===part)).toHaveLength(2);
  expect(SPEAKING_PROMPTS.filter(p=>p.part===2).every(p=>p.preparationSeconds===60&&p.practiceSeconds===120)).toBe(true);
  expect(SPEAKING_PROMPTS.every(p=>p.practiceSeconds>0&&p.practiceSeconds<=120&&p.review.length>0)).toBe(true);
  expect(SPEAKING_CRITERIA).toHaveLength(4);
 });
});
