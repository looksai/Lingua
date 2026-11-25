import {describe,it,expect} from "vitest";
import {CALCatalogTutorSessions} from "./cal-catalog-runtime";

describe("in-process CAL consent cancellation",()=>{
  it("never reactivates a revoked lease after a new turn",()=>{
    const runtime=new CALCatalogTutorSessions();
    const old=runtime.beginTurn(1);
    const other=runtime.beginTurn(2);
    runtime.revoke(1);
    const fresh=runtime.beginTurn(1);
    expect(old.active()).toBe(false);
    expect(other.active()).toBe(true);
    expect(fresh.active()).toBe(true);
    old.release();
    runtime.revoke(1);
    expect(fresh.active()).toBe(false);
    expect(other.active()).toBe(true);
    fresh.release();other.release();
  });
  it("invalidates all concurrent leases and tolerates repeated revocation",()=>{
    const runtime=new CALCatalogTutorSessions();
    const a=runtime.beginTurn(1),b=runtime.beginTurn(1);
    runtime.revoke(1);runtime.revoke(1);
    expect(a.active()).toBe(false);
    expect(b.active()).toBe(false);
    a.release();b.release();
    expect(runtime.inspectForTest(1)).toBeNull();
  });
});
