import {describe,it,expect} from "vitest";
import {canTransitionEvent,validEventSchedule,validEventTitle,type EventStatus} from "./partner-event-policy";
describe("event lifecycle",()=>{
 it("permits only explicit forward transitions",()=>{
 const states:EventStatus[]=["draft","published","live","ended","cancelled"];
 const allowed=new Set(["draft:published","draft:cancelled","published:live","published:cancelled","live:ended","live:cancelled"]);
 for(const from of states)for(const to of states)expect(canTransitionEvent(from,to)).toBe(allowed.has(from+":"+to));
 });
 it("validates title and MySQL timestamp bounds",()=>{expect(validEventTitle(" Event ")).toBe(true);expect(validEventTitle(" ")).toBe(false);expect(validEventTitle("x".repeat(201))).toBe(false);expect(validEventSchedule(Date.now())).toBe(true);expect(validEventSchedule(Infinity)).toBe(false);expect(validEventSchedule(2147483647001)).toBe(false);});
});
