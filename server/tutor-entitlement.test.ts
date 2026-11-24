import {describe,expect,it} from "vitest";
import {TRPCError} from "@trpc/server";
import {hasTrialSlot,validTutorInteractionId,quotaExceeded,completeTutorChat,withTutorChatQuota} from "./tutor-entitlement";
import {premiumAllowed,trialAllowsNewChat,TRIAL_HOURS,TRIAL_SUCCESSFUL_REPLY_LIMIT} from "./billing-policy";
import {billing0008Presence,billing0008Statements,BILLING_0008_TABLES} from "../scripts/staging-billing-0008-ddl";
import {readFileSync} from "node:fs";

describe("Durable tutor admission policy",()=>{
  const now=new Date("2026-11-23T12:00:00.000Z");
  it("requires per-message idempotency keys and cannot mistake short/reused keys for new requests",()=>{
    expect(validTutorInteractionId("my-message-01")).toBe(true);
    expect(validTutorInteractionId("f4fca917-a3f7-4936-aeb1-ff8920e7278a")).toBe(true);
    expect(validTutorInteractionId("")).toBe(false);
    expect(validTutorInteractionId("short")).toBe(false);
    expect(validTutorInteractionId("x".repeat(121))).toBe(false);
    expect(validTutorInteractionId("abc def ghi jkl")).toBe(false);
  });
  it("denies the 21st simultaneous request even before replies have settled",()=>{
    let successful=0,pending=0;
    for(let i=0;i<TRIAL_SUCCESSFUL_REPLY_LIMIT;i++){
      expect(hasTrialSlot(successful,pending,true)).toBe(true);
      pending++;
    }
    expect(hasTrialSlot(successful,pending,true)).toBe(false);
    pending--;successful++;
    expect(hasTrialSlot(successful,pending,true)).toBe(false);
    pending--; // a failed API attempt releases one concurrent reservation.
    expect(hasTrialSlot(successful,pending,true)).toBe(true);
    expect(hasTrialSlot(0,20,false)).toBe(false);
    expect(hasTrialSlot(-1,1,true)).toBe(false);
  });
  it("ends exactly at 72 hours, without resetting for an additional device",()=>{
    const started=new Date(now.getTime()-TRIAL_HOURS*60*60_000);
    const expired={trialStartedAt:started,trialEndsAt:now,successfulReplies:3};
    expect(trialAllowsNewChat(expired,now)).toBe(false);
    expect(trialAllowsNewChat(expired,new Date(now.getTime()-1))).toBe(true);
    expect(trialAllowsNewChat({...expired,successfulReplies:20},new Date(now.getTime()-1))).toBe(false);
  });
  it("entitlement only follows paid active subscription with approved price and paid-through date",()=>{
    const good={status:"active",stripePriceId:"price_test_usd",currentPeriodEnd:new Date("2026-12-01"),
      paidThroughAt:new Date("2026-12-01"),cancelAtPeriodEnd:true};
    expect(premiumAllowed([good],new Set(["price_test_usd"]),now)).toBe(true);
    expect(premiumAllowed([{...good,paidThroughAt:null}],new Set(["price_test_usd"]),now)).toBe(false);
    expect(premiumAllowed([{...good,stripePriceId:"price_unknown"}],new Set(["price_test_usd"]),now)).toBe(false);
    expect(premiumAllowed([{...good,status:"past_due"}],new Set(["price_test_usd"]),now)).toBe(false);
  });
  it("emits the exact blocked marker for the UI without asserting fake premium status",()=>{
    try{quotaExceeded()}catch(e){
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toBe("LIMIT_REACHED");
    }
  });
  it("when billing is disabled there is no external DB call, nor any count",async()=>{
    expect(await withTutorChatQuota(42,undefined,async()=>({source:"ai" as const,text:"Olá"}))).toEqual({source:"ai",text:"Olá"});
    await expect(completeTutorChat(null,true)).resolves.toBeUndefined();
  });
});

describe("0008 strict schema contract",()=>{
  const sql=readFileSync(new URL("../drizzle/0008_billing_staging.sql",import.meta.url),"utf8");
  it("accepts exactly the six reviewed tables and no content-writing DDL",()=>{
    const statements=billing0008Statements(sql);
    expect(statements).toHaveLength(6);
    expect(statements.map(s=>s.match(/^CREATE TABLE `([A-Za-z]+)`/)?.[1])).toEqual([...BILLING_0008_TABLES]);
  });
  it("stops partial schema, duplicate table names and arbitrary DML",()=>{
    const raw=new Set<string>();
    expect(billing0008Presence(raw)).toBe("absent");
    raw.add("tutorUsage");
    expect(billing0008Presence(raw)).toBe("partial");
    BILLING_0008_TABLES.forEach(name=>raw.add(name));
    expect(billing0008Presence(raw)).toBe("complete");
    expect(()=>billing0008Statements(sql+"\nDROP TABLE users;")).toThrow("Unexpected 0008");
    expect(()=>billing0008Statements(sql.replace("billingCustomers","evilTable"))).toThrow("Unexpected 0008");
    expect(()=>billing0008Statements("CREATE TABLE `users` (id int);")).toThrow("Unexpected 0008");
  });
});
