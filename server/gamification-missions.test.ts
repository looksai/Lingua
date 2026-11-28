import {describe,it,expect} from "vitest";
import {participationMissions} from "../shared/gamification-missions";
import {projectXp} from "../shared/gamification-contract";
const monday=Date.UTC(2026,10,23),day=86400000;
const review=(sourceId:string,occurredAtMs:number)=>({kind:"review_completed" as const,sourceId,occurredAtMs});
describe("Participation missions",()=>{
 it("deduplicates receipts and ignores future and previous day events",()=>{
  const awards=projectXp([review("old",monday-1),review("a",monday),review("b",monday+1),review("future",monday+3)]);
  const missions=participationMissions([...awards,...awards],monday+2);
  expect(missions.find(m=>m.id==="daily-review")).toMatchObject({progress:2,completed:false,startMs:monday,endMs:monday+day});
  expect(missions.find(m=>m.id==="weekly-review")).toMatchObject({progress:2,startMs:monday,endMs:monday+7*day});
 });
 it("completes and resets daily missions without resetting weekly progress",()=>{
  const awards=projectXp(Array.from({length:6},(_,i)=>review(String(i),monday+i)));
  expect(participationMissions(awards,monday+10).find(m=>m.id==="daily-review")).toMatchObject({progress:5,completed:true});
  expect(participationMissions(awards,monday+day).find(m=>m.id==="daily-review")).toMatchObject({progress:0,completed:false});
  expect(participationMissions(awards,monday+day).find(m=>m.id==="weekly-review")).toMatchObject({progress:6});
  expect(participationMissions(awards,monday+7*day).find(m=>m.id==="weekly-review")).toMatchObject({progress:0});
 });
 it("rejects invalid clocks",()=>{expect(()=>participationMissions([],NaN)).toThrow();});
});
