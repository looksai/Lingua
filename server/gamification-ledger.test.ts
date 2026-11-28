import {describe,it,expect} from "vitest";
import {recordParticipation,type GamificationLedger,type LedgerEntry} from "./gamification-ledger";
function lab():GamificationLedger{
 const rows=new Map<number,LedgerEntry[]>(),tails=new Map<number,Promise<unknown>>();
 return {transaction(userId,work){
  const run=(tails.get(userId)??Promise.resolve()).catch(()=>{}).then(async()=>{
   const entries=[...(rows.get(userId)??[])];
   const result=await work({
    async find(kind,sourceId){return entries.find(e=>e.kind===kind&&e.sourceId===sourceId);},
    async countAwarded(kind,from,to){return entries.filter(e=>e.kind===kind&&e.occurredAtMs>=from&&e.occurredAtMs<to&&e.xp>0).length;},
    async insert(entry){entries.push(entry);}
   });
   rows.set(userId,entries);return result;
  });
  tails.set(userId,run);return run;
 }};
}
const event=(sourceId:string,occurredAtMs=0)=>({kind:"lesson_completed" as const,sourceId,occurredAtMs});
describe("Transactional participation awards",()=>{
 it("caps concurrent distinct awards and preserves zero receipts",async()=>{
  const store=lab();
  const results=await Promise.all(Array.from({length:20},(_,i)=>recordParticipation(store,1,event(String(i)))));
  expect(results.reduce((s,e)=>s+e.xp,0)).toBe(200);
  expect(await recordParticipation(store,1,event("19"))).toMatchObject({xp:0});
  await expect(recordParticipation(store,1,event("19",86400000))).rejects.toThrow("Conflicting");
 });
 it("deduplicates concurrent replays and isolates owners",async()=>{
  const store=lab();
  const results=await Promise.all(Array.from({length:20},()=>recordParticipation(store,1,event("same"))));
  expect(results.every(e=>e.xp===20)).toBe(true);
  expect(await recordParticipation(store,2,event("same"))).toMatchObject({xp:20});
  const more=await Promise.all(Array.from({length:10},(_,i)=>recordParticipation(store,1,event(String(i)))));
  expect(more.reduce((s,e)=>s+e.xp,0)).toBe(180);
 });
 it("rejects invalid owners and evidence",async()=>{
  const store=lab();
  await expect(recordParticipation(store,0,event("a"))).rejects.toThrow();
  await expect(recordParticipation(store,1,event(""))).rejects.toThrow();
 });
});
