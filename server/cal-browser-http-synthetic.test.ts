import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import express from "express";
import {createServer,type Server} from "node:http";
import {createServer as createViteServer,type ViteDevServer} from "vite";
import {pathToFileURL} from "node:url";
import path from "node:path";
import {createExpressMiddleware} from "@trpc/server/adapters/express";
import {parse as parseCookie} from "cookie";
import {COOKIE_NAME} from "../shared/const";

const spies=vi.hoisted(()=>({reply:vi.fn()}));
vi.mock("./db",()=>({
  getDb:async()=>({
    select:()=>({from:()=>({where:()=>({limit:async()=>[{
      tutorName:"Naruto",tutorPersona:"welcoming",interest:"work",
    }]})})}),
  }),
}));
vi.mock("./tutor-budget",()=>({
  tutorMode:()=>"groq",paidTutorAllowed:()=>false,
  freeTutorAllowed:(email:string)=>email.endsWith("@synthetic.invalid"),
  geminiDemoAllowed:()=>false,
  withTutorBudget:async(_id:number,fn:()=>Promise<unknown>)=>fn(),
}));
vi.mock("./tutor-provider-selector",()=>({
  createSelectedTutor:()=>({
    reply:(...args:unknown[])=>spies.reply(...args),
    replyWithProposal:(...args:unknown[])=>spies.reply(...args),
  }),
}));

import {tutorRouter} from "./tutor-router";
import {router} from "./_core/trpc";
import {enforceSameOrigin} from "./auth-origin";
import {issueSession,verifySession} from "./auth-local";
import {calCatalogTutorSessions} from "./cal-catalog-runtime";
import type {TrpcContext} from "./_core/context";

type BrowserApi={
  close():Promise<void>;
  newContext(opts:Record<string,unknown>):Promise<any>;
};
type BrowserLauncher={launch(opts:Record<string,unknown>):Promise<BrowserApi>};
type SyntheticIdentity={id:number;openId:string;email:string};
let browser:BrowserApi;
let vite:ViteDevServer;
let server:Server;
let address="";
let seq=994_000;
const users=new Map<number,SyntheticIdentity>();
const url=()=>address+"/qa/http-integration.html";
const gate=process.env.LINGUA_BROWSER_HTTP_QA==="1";

async function identity(){
  const id=++seq;
  const user={id,openId:"local:browser-qa-"+id,email:"qa-"+id+"@synthetic.invalid"};
  users.set(id,user);
  return {id,token:await issueSession(user as never)};
}
async function context(token?:string){
  const ctx=await browser.newContext({viewport:{width:1280,height:720}});
  if(token)await ctx.addCookies([{name:COOKIE_NAME,value:token,url:address,httpOnly:true,sameSite:"Lax"}]);
  const page=await ctx.newPage();
  await page.route("**/*",(route:any)=>{
    const dest=new URL(route.request().url());
    if(dest.hostname==="127.0.0.1"&&dest.port===new URL(address).port&&dest.protocol==="http:")
      return route.continue();
    return route.abort("blockedbyclient");
  });
  await page.goto(url(),{waitUntil:"networkidle"});
  await page.getByRole("heading",{name:"Lingua QA — HTTP autenticado sintético"}).waitFor();
  return {ctx,page};
}
async function send(page:any,message:string,mode:"typed"|"asr_text"="typed"){
  await page.getByTestId("message").fill(message);
  await page.getByTestId("modality").selectOption(mode);
  await page.getByTestId("send").click();
  await page.getByTestId("send").waitFor({state:"visible"});
  await page.waitForFunction(()=>!(document.querySelector('[data-testid="send"]') as HTMLButtonElement)?.disabled);
}
async function show(page:any){
  const section=page.getByRole("region",{name:"Atividade do catálogo do Lingua"});
  await section.waitFor();
  await section.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-testid="ack-status"]')?.textContent==="recorded");
}

describe.skipIf(!gate)("synthetic-browser HTTP → signed tRPC → CAL → real catalogue React view",()=>{
  beforeAll(async()=>{
    vi.stubEnv("SESSION_SECRET","synthetic-browser-QA-secret-only-32bytes-not-production");
    vi.stubEnv("CAL_ENABLED","true");
    vi.stubEnv("CAL_CATALOG_ENABLED","true");
    vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
    // Importing the real tutor router never connects to Aiven: DB, profile and
    // model are all mocked above, JWT verification remains the production code.
    const app=express();
    app.use(express.json({limit:"100kb"}));
    app.use("/api/trpc",enforceSameOrigin);
    app.use("/api/trpc",createExpressMiddleware({
      router:router({tutor:tutorRouter}),
      createContext:async({req,res})=>{
        const token=parseCookie(req.headers.cookie??"")[COOKIE_NAME];
        const verified=await verifySession(token);
        const user=verified?users.get(verified.id):null;
        return {req,res,user:(user&&user.openId===verified?.openId?user:null) as TrpcContext["user"]};
      },
    }));
    vite=await createViteServer({
      configFile:"tests/browser/vite.qa.config.ts",
      appType:"spa",
      logLevel:"error",
      server:{middlewareMode:true,hmr:false},
    });
    app.use(vite.middlewares);
    server=createServer(app);
    await new Promise<void>((resolve,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",()=>resolve());
    });
    const bound=server.address();
    if(!bound||typeof bound==="string")throw Error("Missing localhost HTTP port");
    address="http://127.0.0.1:"+bound.port;
    const root=process.env.LINGUA_QA_PLAYWRIGHT_DIR||"/tmp/lingua-browser-tools";
    const mod=await import(/* @vite-ignore */ pathToFileURL(
      path.join(root,"node_modules/playwright/index.mjs"),
    ).href) as {chromium:BrowserLauncher};
    browser=await mod.chromium.launch({headless:true});
  },60_000);
  afterAll(async()=>{
    await browser?.close();
    await vite?.close();
    if(server?.listening)await new Promise<void>((resolve,reject)=>
      server.close(err=>err?reject(err):resolve()));
    vi.unstubAllEnvs();
  });
  beforeEach(()=>{
    spies.reply.mockReset();
    spies.reply.mockResolvedValue("Vamos praticar com calma.");
    vi.stubEnv("CAL_ENABLED","true");
    vi.stubEnv("CAL_CATALOG_ENABLED","true");
    vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
  });

  it("browser starts task → viewport emits real ACK → typed reply advances CAL",async()=>{
    const {id,token}=await identity();
    const {ctx,page}=await context(token);
    try{
      await send(page,"Quero praticar Hello");
      await page.getByText("Na frase Hello, qual é o significado?").waitFor();
      expect(calCatalogTutorSessions.inspectForTest(id)?.cal.phase).toBe("ENSINAR");
      expect(calCatalogTutorSessions.inspectForTest(id)?.cal.observations).toEqual([]);
      await show(page);
      const issued=calCatalogTutorSessions.pendingClientTask(id)!;
      expect(calCatalogTutorSessions.confirmBrowserRender(id,issued.sessionId,issued.deliveryId)).toBe("duplicate");
      await send(page,"Olá");
      expect(calCatalogTutorSessions.inspectForTest(id)?.cal.phase).toBe("PRATICAR");
      expect(calCatalogTutorSessions.inspectForTest(id)?.cal.observations).toEqual([]);
      await page.getByText("Como você escreveria Olá em inglês?",{exact:false}).waitFor();
      await show(page);
      await send(page,"Hello");
      const observations=calCatalogTutorSessions.inspectForTest(id)?.cal.observations;
      expect(observations).toHaveLength(1);
      expect(observations?.[0].outcome).toBe("meets");
      expect(calCatalogTutorSessions.inspectForTest(id)).not.toHaveProperty("learnerEvidence");
    }finally{await ctx.close();}
  },40_000);

  it("two browser cookie jars cannot acknowledge each other's lesson",async()=>{
    const a=await identity(),b=await identity();
    const first=await context(a.token),second=await context(b.token);
    try{
      await send(first.page,"Quero praticar Hello");
      await first.page.getByText("Na frase Hello, qual é o significado?").waitFor();
      const ticket=calCatalogTutorSessions.pendingClientTask(a.id)!;
      const before=structuredClone(calCatalogTutorSessions.inspectForTest(a.id));
      const forbidden=await second.page.evaluate(async issued=>{
        const response=await fetch("/api/trpc/tutor.catalogRenderAck",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({json:{consent:true,...issued}}),
        });
        const body=await response.json();
        return {status:response.status,result:body?.result?.data?.json?.status};
      },{sessionId:ticket.sessionId,deliveryId:ticket.deliveryId});
      expect(forbidden).toEqual({status:200,result:"rejected"});
      expect(calCatalogTutorSessions.inspectForTest(a.id)).toEqual(before);
      expect(calCatalogTutorSessions.pendingClientTask(b.id)).toBeNull();
      await show(first.page);
      expect(calCatalogTutorSessions.confirmBrowserRender(a.id,ticket.sessionId,ticket.deliveryId)).toBe("duplicate");
      expect(calCatalogTutorSessions.inspectForTest(b.id)).toBeNull();
    }finally{await first.ctx.close();await second.ctx.close();}
  },40_000);

  it("browser reload restores only the server-owned pending ticket and then ACKs",async()=>{
    const a=await identity(),first=await context(a.token);
    try{
      await send(first.page,"Quero praticar Hello");
      await first.page.getByText("Na frase Hello, qual é o significado?").waitFor();
      const pending=calCatalogTutorSessions.pendingClientTask(a.id)!;
      await first.page.reload({waitUntil:"networkidle"});
      await first.page.waitForFunction(()=>document.querySelector('[data-testid="recovered"]')?.textContent==="yes");
      await first.page.getByText(pending.promptText).waitFor();
      await show(first.page);
      const after=calCatalogTutorSessions.pendingClientTask(a.id)!;
      expect(after.deliveryId).toBe(pending.deliveryId);
    }finally{await first.ctx.close();}
  },40_000);

  it("ASR-origin browser message after ACK does not advance or award observations",async()=>{
    const a=await identity(),first=await context(a.token);
    try{
      await send(first.page,"Quero praticar Hello");
      await show(first.page);
      const before=structuredClone(calCatalogTutorSessions.inspectForTest(a.id));
      await send(first.page,"Olá","asr_text");
      expect(calCatalogTutorSessions.inspectForTest(a.id)).toEqual(before);
      expect(calCatalogTutorSessions.inspectForTest(a.id)?.cal.observations).toEqual([]);
    }finally{await first.ctx.close();}
  },40_000);

  it("anonymous browser cannot create a CAL session, and off-origin HTTP is blocked",async()=>{
    const first=await context();
    try{
      await send(first.page,"Quero praticar Hello");
      await first.page.waitForFunction(()=>document.querySelector('[data-testid="error"]')?.textContent?.includes("UNAUTHORIZED"));
      const attacker=await fetch(address+"/api/trpc/tutor.reply",{
        method:"POST",
        headers:{"Content-Type":"application/json","Origin":"https://other.invalid"},
        body:JSON.stringify({json:{message:"Quero praticar Hello",consent:true,
          provider:"groq",voice:false,history:[]}}),
      });
      expect(attacker.status).toBe(403);
    }finally{await first.ctx.close();}
  },40_000);

  it("explicit browser reset revokes the old delivery receipt",async()=>{
    const a=await identity(),first=await context(a.token);
    try{
      await send(first.page,"Quero praticar Hello");
      await first.page.getByText("Na frase Hello, qual é o significado?").waitFor();
      const old=calCatalogTutorSessions.pendingClientTask(a.id)!;
      await first.page.getByTestId("reset").click();
      await first.page.waitForFunction(()=>!(document.querySelector('[data-testid="reset"]') as HTMLButtonElement)?.disabled);
      const current=calCatalogTutorSessions.pendingClientTask(a.id)!;
      expect(current.sessionId).not.toBe(old.sessionId);
      const stale=await first.page.evaluate(async submitted=>{
        const response=await fetch("/api/trpc/tutor.catalogRenderAck",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({json:{consent:true,...submitted}}),
        });
        return (await response.json())?.result?.data?.json?.status;
      },{sessionId:old.sessionId,deliveryId:old.deliveryId});
      expect(stale).toBe("rejected");
      expect(calCatalogTutorSessions.inspectForTest(a.id)?.cal.observations).toEqual([]);
    }finally{await first.ctx.close();}
  },40_000);
});
