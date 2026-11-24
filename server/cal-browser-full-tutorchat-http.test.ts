import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import express from "express";
import {createServer,type Server} from "node:http";
import {createServer as createViteServer,type ViteDevServer} from "vite";
import {pathToFileURL} from "node:url";
import path from "node:path";
import {createExpressMiddleware} from "@trpc/server/adapters/express";
import {parse as parseCookie} from "cookie";
import {COOKIE_NAME} from "../shared/const";

const spies=vi.hoisted(()=>({model:vi.fn()}));
vi.mock("./db",()=>({
  // NO MySQL/Aiven: a single fake profile lookup, no writes.
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
  withTutorBudget:async(_user:number,work:()=>Promise<unknown>)=>work(),
}));
vi.mock("./tutor-provider-selector",()=>({
  createSelectedTutor:()=>({
    reply:(...args:unknown[])=>spies.model(...args),
    replyWithProposal:(...args:unknown[])=>spies.model(...args),
  }),
}));

import {tutorRouter} from "./tutor-router";
import {router,protectedProcedure} from "./_core/trpc";
import {enforceSameOrigin} from "./auth-origin";
import {issueSession,verifySession} from "./auth-local";
import {calCatalogTutorSessions} from "./cal-catalog-runtime";
import type {TrpcContext} from "./_core/context";

type FakeUser={id:number;openId:string;email:string};
type BrowserApi={close():Promise<void>;newContext(opts:Record<string,unknown>):Promise<any>};
type BrowserLauncher={launch(opts:Record<string,unknown>):Promise<BrowserApi>};
const gate=process.env.LINGUA_BROWSER_FULL_HTTP_QA==="1";
let server:Server,vite:ViteDevServer,browser:BrowserApi;
let address="";
let identitySequence=997_000;
const accounts=new Map<number,FakeUser>();
const publicUrl=()=>address+"/qa/tutorchat-http.html";

async function syntheticIdentity(letter:"a"|"b"){
  const id=++identitySequence;
  const user={id,email:"qa-"+letter+"@synthetic.invalid",openId:"local:full-tutorchat-http-"+id};
  accounts.set(id,user);
  return {user,token:await issueSession(user as never)};
}
async function openBrowser(token?:string){
  const ctx=await browser.newContext({viewport:{width:1280,height:820}});
  if(token)await ctx.addCookies([{name:COOKIE_NAME,value:token,url:address,httpOnly:true,sameSite:"Lax"}]);
  const page=await ctx.newPage();
  const errors:string[]=[];
  page.on("pageerror",(error:Error)=>errors.push(error.message));
  page.on("console",(message:any)=>{
    if(message.type()==="error")errors.push(message.text());
  });
  // Permit the one ephemeral loopback port only.
  await page.route("**/*",(route:any)=>{
    const u=new URL(route.request().url());
    if(u.protocol==="http:"&&u.hostname==="127.0.0.1"&&u.port===new URL(address).port)
      return route.continue();
    return route.abort("blockedbyclient");
  });
  await page.goto(publicUrl(),{waitUntil:"networkidle"});
  await page.getByRole("complementary",{name:"Chat com Naruto"}).waitFor();
  if(token){
    // The real capabilities query must finish before attempting consent.
    await page.waitForFunction(()=>{
      const b=document.querySelector('button[aria-label="Segure para falar; teclado: ativar e parar"]') as HTMLButtonElement|null;
      return b&&!b.disabled;
    });
  }
  return {ctx,page,errors};
}
function response(page:any,procedure:string){
  return page.waitForResponse((r:any)=>
    r.url().includes("/api/trpc/tutor."+procedure) && r.request().method()==="POST",{
      timeout:15_000,
    });
}
async function draftSend(page:any,message:string){
  await page.getByRole("textbox",{name:"Sua mensagem"}).fill(message);
  const promise=response(page,"reply");
  await page.getByRole("button",{name:"Enviar mensagem"}).click();
  await promise;
}
async function firstConsent(page:any,message="Quero praticar Hello",expectAck=true){
  await page.getByRole("textbox",{name:"Sua mensagem"}).fill(message);
  await page.getByRole("button",{name:"Enviar mensagem"}).click();
  await page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
  const replied=response(page,"reply");
  const acknowledged=expectAck?response(page,"catalogRenderAck"):null;
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button",{name:"Aceitar e enviar"}).click();
  await replied;
  if(acknowledged)await acknowledged;
}
async function closeAll(...contexts:any[]){
  await Promise.all(contexts.map(x=>x?.ctx?.close()));
}

describe.skipIf(!gate)("full TutorChat with REAL React Query/tRPC/HTTP/JWT and synthetic accounts",()=>{
  beforeAll(async()=>{
    vi.stubEnv("SESSION_SECRET","full-tutorchat-http-QA-secret-is-local-and-nonproduction");
    vi.stubEnv("CAL_ENABLED","true");
    vi.stubEnv("CAL_CATALOG_ENABLED","true");
    vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");

    const app=express();
    app.use(express.json({limit:"100kb"}));
    app.use("/api/trpc",enforceSameOrigin);
    // placement.me is a synthetic read-only endpoint; the production TutorChat
    // still uses the real tRPC hook to call it over HTTP.
    const placement=router({
      me:protectedProcedure.query(()=>({nextTask:null,answers:[]})),
    });
    app.use("/api/trpc",createExpressMiddleware({
      router:router({tutor:tutorRouter,placement}),
      createContext:async({req,res})=>{
        const cookie=parseCookie(req.headers.cookie??"")[COOKIE_NAME];
        const verified=await verifySession(cookie);
        const user=verified?accounts.get(verified.id):undefined;
        return {req,res,user:(user&&verified?.openId===user.openId?user:null) as TrpcContext["user"]};
      },
    }));
    // No mock alias: the UI loads the production @/lib/trpc, QueryClient and
    // HTTP batch link. Only the test server's DB/LLM and account directory are fake.
    vite=await createViteServer({
      configFile:"tests/browser/vite.qa.config.ts",
      appType:"spa",logLevel:"error",
      server:{middlewareMode:true,hmr:false},
    });
    app.use(vite.middlewares);
    server=createServer(app);
    await new Promise<void>((resolve,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",resolve);
    });
    const found=server.address();
    if(!found||typeof found==="string")throw Error("No local QA port");
    address="http://127.0.0.1:"+found.port;
    const dir=process.env.LINGUA_QA_PLAYWRIGHT_DIR||"/tmp/lingua-browser-tools";
    const {chromium}=await import(/* @vite-ignore */pathToFileURL(
      path.join(dir,"node_modules/playwright/index.mjs"),
    ).href) as {chromium:BrowserLauncher};
    browser=await chromium.launch({headless:true});
  },60_000);
  afterAll(async()=>{
    await browser?.close();
    await vite?.close();
    if(server?.listening)await new Promise<void>((resolve,reject)=>
      server.close(error=>error?reject(error):resolve()));
    vi.unstubAllEnvs();
  });
  beforeEach(()=>{
    spies.model.mockReset();
    spies.model.mockResolvedValue("Vamos praticar com calma.");
    vi.stubEnv("CAL_ENABLED","true");
    vi.stubEnv("CAL_CATALOG_ENABLED","true");
    vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
  });

  it("no LLM before consent; actual TutorChat sends HTTP and browser ACK then progresses CAL",async()=>{
    const a=await syntheticIdentity("a");
    const one=await openBrowser(a.token);
    try {
      await one.page.getByRole("textbox",{name:"Sua mensagem"}).fill("Quero praticar Hello");
      await one.page.getByRole("button",{name:"Enviar mensagem"}).click();
      await one.page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
      expect(spies.model).not.toHaveBeenCalled();
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)).toBeNull();
      const replied=response(one.page,"reply");
      const acknowledged=response(one.page,"catalogRenderAck");
      await one.page.getByRole("dialog").getByRole("checkbox").check();
      await one.page.getByRole("button",{name:"Aceitar e enviar"}).click();
      await replied;
      await one.page.getByRole("region",{name:"Atividade do catálogo do Lingua"}).waitFor();
      await acknowledged;
      expect(spies.model).toHaveBeenCalledTimes(1);
      const issued=calCatalogTutorSessions.pendingClientTask(a.user.id)!;
      expect(issued).toBeTruthy();
      expect(calCatalogTutorSessions.confirmBrowserRender(a.user.id,issued.sessionId,issued.deliveryId))
        .toBe("duplicate");
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)?.cal.phase).toBe("ENSINAR");
      const secondAck=response(one.page,"catalogRenderAck");
      await draftSend(one.page,"Olá");
      await secondAck;
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)?.cal.phase).toBe("PRATICAR");
      await draftSend(one.page,"Hello");
      await vi.waitFor(()=>expect(calCatalogTutorSessions.inspectForTest(a.user.id)?.cal.observations)
        .toHaveLength(1),{timeout:4000});
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)?.cal.observations[0].outcome)
        .toBe("meets");
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)).not.toHaveProperty("learnerEvidence");
      expect(one.errors).toEqual([]);
    }finally{await closeAll(one);}
  },45_000);

  it("two separate signed browser sessions cannot acknowledge each other's CAL ticket",async()=>{
    const a=await syntheticIdentity("a"),b=await syntheticIdentity("b");
    const one=await openBrowser(a.token),two=await openBrowser(b.token);
    try{
      await firstConsent(one.page);
      const ticket=calCatalogTutorSessions.pendingClientTask(a.user.id)!;
      const previous=structuredClone(calCatalogTutorSessions.inspectForTest(a.user.id));
      const denied=await two.page.evaluate(async issued=>{
        const res=await fetch("/api/trpc/tutor.catalogRenderAck",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({json:{consent:true,...issued}}),
        });
        const payload=await res.json();
        return {http:res.status,status:payload?.result?.data?.json?.status};
      },{sessionId:ticket.sessionId,deliveryId:ticket.deliveryId});
      expect(denied).toEqual({http:200,status:"rejected"});
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)).toEqual(previous);
      expect(calCatalogTutorSessions.inspectForTest(b.user.id)).toBeNull();
      await firstConsent(two.page,"Quero aprender a me apresentar");
      const own=calCatalogTutorSessions.pendingClientTask(b.user.id)!;
      expect(own.sessionId).not.toBe(ticket.sessionId);
      expect(own.taskId).not.toBe(ticket.taskId);
    }finally{await closeAll(one,two);}
  },45_000);

  it("reload restores only server-authorized pending task in the full TutorChat",async()=>{
    const a=await syntheticIdentity("a");
    const one=await openBrowser(a.token);
    try{
      await firstConsent(one.page);
      const pending=calCatalogTutorSessions.pendingClientTask(a.user.id)!;
      await one.page.reload({waitUntil:"networkidle"});
      await one.page.getByText("Atividade pendente recuperada desta sessão",{exact:false}).waitFor({timeout:12_000});
      await one.page.getByRole("region",{name:"Atividade do catálogo do Lingua"}).waitFor();
      expect(await one.page.getByRole("region",{name:"Atividade do catálogo do Lingua"}).innerText())
        .toContain(pending.promptText);
      expect(calCatalogTutorSessions.pendingClientTask(a.user.id)?.deliveryId).toBe(pending.deliveryId);
      expect(calCatalogTutorSessions.inspectForTest(a.user.id)?.cal.observations).toEqual([]);
    }finally{await closeAll(one);}
  },40_000);

  it("late real HTTP reply is not rendered after synthetic account/cookie change",async()=>{
    const a=await syntheticIdentity("a"),b=await syntheticIdentity("b");
    const one=await openBrowser(a.token);
    try{
      await firstConsent(one.page);
      let resolveReply!:(value:string)=>void;
      let entered!:()=>void;
      const enteredPromise=new Promise<void>(resolve=>{entered=resolve;});
      spies.model.mockImplementationOnce(()=>new Promise<string>(resolve=>{
        resolveReply=resolve;entered();
      }));
      await one.page.getByRole("textbox",{name:"Sua mensagem"}).fill("Mensagem privada da conta A");
      const delayedResponse=response(one.page,"reply");
      await one.page.getByRole("button",{name:"Enviar mensagem"}).click();
      await enteredPromise;
      // Switch the signed cookie AND account-specific React identity hint.
      // This is an isolated test maneuver, not a real login workflow.
      await one.ctx.addCookies([{name:COOKIE_NAME,value:b.token,url:address,
        httpOnly:true,sameSite:"Lax"}]);
      await one.page.getByTestId("qa-switch-account").click();
      await one.page.getByTestId("qa-email").getByText("qa-b@synthetic.invalid").waitFor();
      resolveReply("RESPOSTA PRIVADA A APÓS TROCA — NÃO EXIBIR");
      await delayedResponse;
      await one.page.getByRole("textbox",{name:"Sua mensagem"}).fill("Mensagem da conta B");
      await one.page.getByRole("button",{name:"Enviar mensagem"}).click();
      await one.page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
      expect(await one.page.getByText("RESPOSTA PRIVADA A APÓS TROCA",{exact:false}).count())
        .toBe(0);
      expect(await one.page.getByText("Mensagem privada da conta A",{exact:false}).count())
        .toBe(0);
      expect(calCatalogTutorSessions.inspectForTest(b.user.id)).toBeNull();
      expect(one.errors).toEqual([]);
    }finally{await closeAll(one);}
  },45_000);
});
