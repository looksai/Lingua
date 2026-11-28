import {describe,it,expect} from "vitest";
import {projectXp,xpProgress,type XpEvent} from "../shared/gamification-contract";
const event=(sourceId:string,occurredAtMs=0):XpEvent=>({kind:"lesson_completed",sourceId,occurredAtMs});
describe("Participation XP",()=>{
 it("deduplicates completion evidence and ignores invalid events",()=>{
  expect(projectXp([event("a"),event("a",86400000),event(""),event("b",-1)])).toHaveLength(1);
 });
 it("caps daily awards and resets on the next UTC day",()=>{
  const events=Array.from({length:12},(_,i)=>event(String(i),i));
  expect(projectXp([...events,event("next",86400000)])).toHaveLength(11);
  expect(projectXp([...events].reverse())).toEqual(projectXp(events));
 });
 it("does not allow a capped event to earn XP by replaying tomorrow",()=>{
  const events=Array.from({length:11},(_,i)=>event(String(i),i));
  expect(projectXp([...events,event("10",86400000)])).toHaveLength(10);
 });
 it("computes levels independently of proficiency",()=>{
  expect(xpProgress([])).toEqual({totalXp:0,level:1,xpIntoLevel:0,xpPerLevel:250});
  const events=Array.from({length:13},(_,i)=>event(String(i),i*86400000));
  expect(xpProgress(projectXp(events))).toEqual({totalXp:260,level:2,xpIntoLevel:10,xpPerLevel:250});
 });
});
