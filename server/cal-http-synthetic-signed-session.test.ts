import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import express from "express";
import {createServer,type Server} from "node:http";
import {createExpressMiddleware} from "@trpc/server/adapters/express";
import {parse as parseCookie} from "cookie";
import {COOKIE_NAME} from "../shared/const";

const spies=vi.hoisted(()=>({model:vi.fn(),profileQueries:vi.fn()}));
// Deliberately no getDb from the application: the fixture is not permitted to
// initialize MySQL/Aiven. Tutor profile is the only select supported.
vi.mock("./db",()=>({
  getDb:async()=>({
    select:()=>({from:()=>({where:()=>({limit:async()=>{
      spies.profileQueries();
      return [{tutorName:"Naruto",tutorPersona:"welcoming",interest:"work"}];
    }})})}),
  }),
}));
vi.mock("./tutor-budget",()=>({
  tutorMode:()=>"groq",
  paidTutorAllowed:()=>false,freeTutorAllowed:(email:string)=>email.endsWith("@synthetic.invalid"),
  geminiDemoAllowed:()=>false,
  withTutorBudget:async(_id:number,fn:()=>Promise<unknown>)=>fn(),
}));
vi.mock("./tutor-provider-selector",()=>({
  createSelectedTutor:()=>({
    reply:(...args:unknown[])=>spies.model(...args),
    replyWithProposal:(...args:unknown[])=>spies.model(...args),
  }),
}));

import {tutorRouter} from "./tutor-router";
import {calCatalogTutorSessions} from "./cal-catalog-runtime";
import {enforceSameOrigin} from "./auth-origin";
import {issueSession,verifySession,checkRequestOrigin} from "./auth-local";
import type {TrpcContext} from "./_core/context";

const fixtures=[
  {id:991_001,openId:"local:qa-synthetic-a",email:"a@synthetic.invalid"},
  {id:991_002,openId:"local:qa-synthetic-b",email:"b@synthetic.invalid"},
] as const;
type SyntheticUser=typeof fixtures[number];
let server:Server;
let base="";
const tokens=new Map<number,string>();

/**
 * HTTP transport and JWT verification are REAL; account directory and tutor
 * provider are synthetic. No real password login, database or external APIs.
 */
async function syntheticContext(req:TrpcContext["req"],res:TrpcContext["res"]):Promise<TrpcContext>{
  const token=parseCookie(req.headers.cookie??"")[COOKIE_NAME];
  const verified=await verifySession(token);
  const user=verified?fixtures.find(person=>
    person.id===verified.id&&person.openId===verified.openId):null;
  return {req,res,user:(user??null) as TrpcContext["user"]};
}

async function http(
  route:"reply"|"catalogRenderAck"|"catalogPendingTask",
  input:Record<string,unknown>|undefined,
  options:{
    as?:number|"anonymous"|"tampered"|"unknown";
    origin?:string|null;
  }={},
){
  const url=base+"/api/trpc/tutor."+route;
  const cookie=options.as===undefined?tokens.get(fixtures[0].id)
    :options.as==="anonymous"?undefined
    :options.as==="tampered"?(tokens.get(fixtures[0].id)+"invalid")
    :options.as==="unknown"?undefined:tokens.get(options.as);
  const headers:Record<string,string>={
    "Content-Type":"application/json",
    "Origin":options.origin===undefined?base:options.origin??"",
  };
  if(cookie)headers.Cookie=COOKIE_NAME+"="+cookie;
  // tRPC 11 + superjson wire envelope: mutation input is {json:...}.
  const response=await fetch(url,{method:"POST",headers,
    body:JSON.stringify({json:input??null}),redirect:"error"});
  const payload=await response.json() as {
    error?:{json?:{message?:string;data?:{code?:string}};data?:{code?:string}};
    result?:{data?:{json?:unknown}};
  };
  return {status:response.status,error:payload.error,
    data:payload.result?.data?.json as Record<string,unknown>|null|undefined};
}
const request=(message:string,more:Record<string,unknown>={})=>({
  message,consent:true,provider:"groq",voice:false,history:[],
  inputModality:"typed",...more,
});
const fakeAck=(task:Record<string,unknown>)=>({
  consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId,
});

beforeAll(async()=>{
  vi.stubEnv("SESSION_SECRET","synthetic-only-session-secret-32-bytes-never-for-use-outside-tests");
  vi.stubEnv("CAL_ENABLED","true");
  vi.stubEnv("CAL_CATALOG_ENABLED","true");
  vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
  // Always enforce the real same-origin HTTP middleware and request-origin
  // checks. NODE_ENV=test (not production TLS) is required for localhost.
  const app=express();
  app.use(express.json({limit:"100kb"}));
  app.use("/api/trpc",enforceSameOrigin);
  app.use("/api/trpc",createExpressMiddleware({
    router:tutorRouter,
    createContext:({req,res})=>syntheticContext(req,res),
  }));
  server=createServer(app);
  await new Promise<void>((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>resolve());
  });
  const address=server.address();
  if(!address||typeof address==="string")throw Error("Missing ephemeral localhost port");
  base="http://127.0.0.1:"+address.port;
  for(const user of fixtures)
    tokens.set(user.id,await issueSession(user as never));
},20_000);
afterAll(async()=>{
  if(server?.listening)await new Promise<void>((resolve,reject)=>
    server.close(err=>err?reject(err):resolve()));
  vi.unstubAllEnvs();
});
beforeEach(()=>{
  spies.model.mockReset();
  spies.model.mockResolvedValue("Vamos praticar com calma.");
  spies.profileQueries.mockClear();
  vi.stubEnv("CAL_ENABLED","true");
  vi.stubEnv("CAL_CATALOG_ENABLED","true");
  vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
});

describe("actual tRPC/Express HTTP + real signed JWT with synthetic directory (no Aiven)",()=>{
  it("issues isolated HTTP lesson tickets for two signed fictional accounts",async()=>{
    const a=await http("reply",request("Quero praticar Hello"));
    const b=await http("reply",request("Quero aprender a me apresentar"),
      {as:fixtures[1].id});
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.data?.source).toBe("ai");
    expect(b.data?.source).toBe("ai");
    const at=a.data?.catalogTask as Record<string,unknown>,bt=b.data?.catalogTask as Record<string,unknown>;
    expect(at).toBeTruthy();expect(bt).toBeTruthy();
    expect(at.sessionId).not.toBe(bt.sessionId);
    expect(at.taskId).not.toBe(bt.taskId);
    expect(calCatalogTutorSessions.inspectForTest(fixtures[0].id)?.selectedCompetencyId)
      .toBe("greeting.hello");
    expect(calCatalogTutorSessions.inspectForTest(fixtures[1].id)?.selectedCompetencyId)
      .toBe("identity.my-name");
  });

  it("refuses unsigned, modified, unknown and missing-session requests before a tutor query",async()=>{
    const before=spies.profileQueries.mock.calls.length;
    for(const as of ["anonymous","tampered","unknown"] as const){
      const response=await http("reply",request("Quero praticar Hello"),{as});
      expect(response.status).toBe(401);
    }
    expect(spies.profileQueries.mock.calls.length).toBe(before);
  });

  it("enforces real HTTP origin middleware before parsing an authenticated mutation",async()=>{
    const before=spies.profileQueries.mock.calls.length;
    const response=await http("reply",request("Quero praticar Hello"),{
      origin:"https://attacker.example.invalid",
    });
    expect(response.status).toBe(403);
    expect(spies.profileQueries.mock.calls.length).toBe(before);
    expect(()=>checkRequestOrigin({headers:{origin:"https://attacker.invalid",
      host:new URL(base).host}} as never)).toThrow();
  });

  it("a typed answer before browser acknowledgment cannot advance the CAL",async()=>{
    const user=fixtures[0].id;
    const start=await http("reply",request("Quero praticar Hello"));
    const ticket=start.data?.catalogTask as Record<string,unknown>;
    const baseline=structuredClone(calCatalogTutorSessions.inspectForTest(user));
    const attempt=await http("reply",request("Olá"));
    expect(attempt.status).toBe(200);
    expect(calCatalogTutorSessions.inspectForTest(user)).toEqual(baseline);
    const accepted=await http("catalogRenderAck",fakeAck(ticket));
    expect(accepted.status).toBe(200);
    expect(accepted.data?.status).toBe("recorded");
    const repeated=await http("catalogRenderAck",fakeAck(ticket));
    expect(repeated.data?.status).toBe("duplicate");
    const next=await http("reply",request("Olá"));
    expect(next.status).toBe(200);
    expect(calCatalogTutorSessions.inspectForTest(user)?.cal.phase).toBe("PRATICAR");
  });

  it("account B cannot fetch, acknowledge or evaluate account A's ticket",async()=>{
    const user=fixtures[0].id;
    const start=await http("reply",request("Quero praticar Hello"));
    const ticket=start.data?.catalogTask as Record<string,unknown>;
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(user));
    const denied=await http("catalogRenderAck",fakeAck(ticket),{as:fixtures[1].id});
    expect(denied.status).toBe(200);
    expect(denied.data?.status).toBe("rejected");
    const pending=await http("catalogPendingTask",undefined,{as:fixtures[1].id});
    expect(pending.status).toBe(200);
    expect(pending.data).toBeNull();
    expect(calCatalogTutorSessions.inspectForTest(user)).toEqual(before);
  });

  it("an ASR response after valid receipt cannot create an assessed closed answer",async()=>{
    const user=fixtures[0].id;
    const start=await http("reply",request("Quero praticar Hello"));
    const ticket=start.data?.catalogTask as Record<string,unknown>;
    expect((await http("catalogRenderAck",fakeAck(ticket))).data?.status).toBe("recorded");
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(user));
    const spoken=await http("reply",request("Olá",{inputModality:"asr_text"}));
    expect(spoken.status).toBe(200);
    expect(calCatalogTutorSessions.inspectForTest(user)).toEqual(before);
    expect(calCatalogTutorSessions.inspectForTest(user)?.cal.observations).toHaveLength(0);
  });

  it("HTTP consent=false returns a local response without committing an exercise",async()=>{
    const user=fixtures[0].id;
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(user));
    const r=await http("reply",request("Quero praticar Hello",{consent:false}));
    expect(r.status).toBe(200);
    expect(r.data?.source).toBe("local");
    expect(calCatalogTutorSessions.inspectForTest(user)).toEqual(before);
  });

  it("reload-style pending-task HTTP request returns only its signed owner's exercise",async()=>{
    const a=await http("reply",request("Quero praticar Hello"));
    const ticket=a.data?.catalogTask as Record<string,unknown>;
    const pending=await http("catalogPendingTask",undefined);
    expect(pending.status).toBe(200);
    expect(pending.data).toMatchObject(ticket);
    const denied=await http("catalogRenderAck",fakeAck(ticket),{as:"anonymous"});
    expect(denied.status).toBe(401);
    const ok=await http("catalogRenderAck",fakeAck(ticket));
    expect(ok.data?.status).toBe("recorded");
  });

  it("old browser receipt is rejected after explicit fresh curriculum restart",async()=>{
    const start=await http("reply",request("Quero praticar Hello"));
    const old=start.data?.catalogTask as Record<string,unknown>;
    const newer=await http("reply",request("Quero recomeçar este assunto do início.",{
      catalogCompetencyId:"greeting.hello",catalogRestart:true,
      inputModality:undefined,
    }));
    expect(newer.status).toBe(200);
    const task=newer.data?.catalogTask as Record<string,unknown>;
    expect(task.sessionId).not.toBe(old.sessionId);
    const stale=await http("catalogRenderAck",fakeAck(old));
    expect(stale.data?.status).toBe("rejected");
    expect((await http("catalogRenderAck",fakeAck(task))).data?.status).toBe("recorded");
  });

  it("a malformed signed receipt is rejected at HTTP schema boundary",async()=>{
    const r=await http("catalogRenderAck",{
      consent:true,sessionId:"short",deliveryId:"x",
    });
    expect(r.status).toBe(400);
  });
});
