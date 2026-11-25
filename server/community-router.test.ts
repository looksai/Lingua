import { afterEach, describe, expect, it, vi } from "vitest";
import { communityRouter } from "./community-router";

const oldFlag=process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
afterEach(()=>{
  if(oldFlag===undefined)delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
  else process.env.LINGUA_PORTAL_COMMUNITY_ENABLED=oldFlag;
});

describe("community API disabled-by-default guard",()=>{
  it("does not access optional SQL tables or invent public groups while disabled",async ()=>{
    delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
    const caller=communityRouter.createCaller({user:null} as never);
    expect(await caller.publicGroups()).toEqual([]);
    expect(await caller.verifiedPartners()).toEqual([]);
    expect(await caller.publicTopics({groupId:1})).toEqual([]);
  });
  it("denies all private participation while disabled even when user authenticated",async ()=>{
    delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
    const caller=communityRouter.createCaller({
      user:{id:33,email:"qa@synthetic.invalid",role:"user"},
    } as never);
    await expect(caller.myGroups()).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    await expect(caller.groupTopics({groupId:1})).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
  });
  it("cannot create a topic just by being logged in with no enabled product",async ()=>{
    delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
    const caller=communityRouter.createCaller({
      user:{id:33,email:"qa@synthetic.invalid",role:"user"},
    } as never);
    await expect(caller.createTopic({groupId:1,title:"Minha experiência",body:"Quero conversar sobre imigração."}))
      .rejects.toMatchObject({code:"PRECONDITION_FAILED"});
  });
});
