import { describe, expect, it } from "vitest";
import { createTutorBudget, tutorBudgetLimits } from "./tutor-budget";

const today = Date.parse("2026-11-25T12:00:00Z");
const env = { LINGUA_TUTOR_DAILY_GLOBAL: "3", LINGUA_TUTOR_DAILY_PER_USER: "2", LINGUA_TUTOR_MAX_CONCURRENT: "2" };
const ok = async () => "ok";
describe("pilot tutor budget", () => {
  it("retains existing defaults and fails closed on malformed or increased limits", () => {
    expect(tutorBudgetLimits({})).toEqual({global:100,perUser:30,concurrent:2});
    expect(tutorBudgetLimits({LINGUA_TUTOR_DAILY_GLOBAL:"101",LINGUA_TUTOR_DAILY_PER_USER:"NaN",LINGUA_TUTOR_MAX_CONCURRENT:"-1"})).toEqual({global:0,perUser:0,concurrent:0});
  });
  it("reserves two units for text and speech and enforces both ceilings", async () => {
    const run = createTutorBudget();
    await expect(run(1,ok,today,2,env)).resolves.toBe("ok");
    await expect(run(1,ok,today,1,env)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
    await expect(run(2,ok,today,1,env)).resolves.toBe("ok");
    await expect(run(3,ok,today,1,env)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
  });
  it("counts failures, releases the lease and does not reset on clock rollback", async () => {
    const run = createTutorBudget();
    await expect(run(1,async()=>{throw Error("provider");},today,2,env)).rejects.toThrow("provider");
    await expect(run(1,ok,today-86400000,1,env)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
    await expect(run(1,ok,today+86400000,1,env)).resolves.toBe("ok");
  });
  it("blocks duplicate and excessive concurrent calls, including across midnight", async () => {
    const run = createTutorBudget();
    let release!:()=>void;
    const held = new Promise<void>(resolve=>{release=resolve;});
    const first = run(1,()=>held,today,1,env);
    const second = run(2,()=>held,today,1,env);
    try {
      await expect(run(1,ok,today,1,env)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
      await expect(run(3,ok,today+86400000,1,env)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
    } finally { release(); await Promise.all([first,second]); }
    await expect(run(3,ok,today+86400000,1,env)).resolves.toBe("ok");
  });
  it("supports an emergency zero limit without calling providers", async () => {
    const run = createTutorBudget();
    let calls = 0;
    await expect(run(1,async()=>{calls++;},today,1,{LINGUA_TUTOR_DAILY_GLOBAL:"0"})).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
    expect(calls).toBe(0);
  });
});
