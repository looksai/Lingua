import {describe,it,expect} from "vitest";
import {SPEAKING_PROMPTS,SPEAKING_CRITERIA,oralSequence} from "../shared/exam-speaking-contract";
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

describe("Guided oral sequence",()=>{
 it("uses five distinct prompts in part order and refuses incomplete catalogues",()=>{
  const sequence=oralSequence(SPEAKING_PROMPTS);
  expect(sequence.map(p=>p.part)).toEqual([1,1,2,3,3]);
  expect(new Set(sequence.map(p=>p.id)).size).toBe(5);
  expect(oralSequence([...SPEAKING_PROMPTS].reverse())).toEqual(sequence);
  expect(oralSequence(SPEAKING_PROMPTS.slice(0,2))).toEqual([]);
 });
});
