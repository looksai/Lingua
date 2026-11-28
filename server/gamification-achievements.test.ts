import {describe,it,expect} from "vitest";
import {projectXp} from "../shared/gamification-contract";
import {achievementProgress} from "../shared/gamification-achievements";
describe("Participation achievements",()=>{
 it("starts locked",()=>expect(achievementProgress([]).every(a=>!a.unlocked&&a.progress===0)).toBe(true));
 it("unlocks only matching evidence and ignores duplicate awards",()=>{
  const awards=projectXp([{kind:"lesson_completed",sourceId:"a",occurredAtMs:0}]);
  const progress=achievementProgress([...awards,...awards]);
  expect(progress.find(a=>a.id==="first-lesson")?.unlocked).toBe(true);
  expect(progress.find(a=>a.id==="hundred-lessons")?.progress).toBe(1);
  expect(progress.find(a=>a.id==="fifty-oral")?.progress).toBe(0);
 });
 it("unlocks at threshold and bounds displayed progress",()=>{
  const awards=projectXp(Array.from({length:101},(_,i)=>({kind:"lesson_completed",sourceId:String(i),occurredAtMs:i*86400000})));
  expect(achievementProgress(awards.slice(0,99)).find(a=>a.id==="hundred-lessons")?.unlocked).toBe(false);
  expect(achievementProgress(awards).find(a=>a.id==="hundred-lessons")).toMatchObject({unlocked:true,progress:100});
 });
});
