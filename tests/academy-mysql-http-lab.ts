import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { enforceSameOrigin } from "../server/auth-origin";
import { firstAccessTasks, supportedFirstAccessLanguages } from "../shared/onboarding";

const LAB_URL = "mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
if (process.env.ACADEMY_MYSQL_LAB !== "1" || process.env.DATABASE_URL !== LAB_URL ||
    process.env.NODE_ENV !== "development" || process.env.DATABASE_SSL_CA_BASE64)
  throw new Error("Refusing to run outside the disposable loopback Academy lab");

// No real provider, deployment secret or user data enters this process.
for (const key of ["OPENAI_API_KEY","GROQ_API_KEY","GEMINI_API_KEY","MANUS_API_KEY","MANUS_API_URL"])
  delete process.env[key];
process.env.LINGUA_TUTOR_ENABLED = "false";
process.env.LINGUA_TUTOR_MEMORY_ENABLED = "true";
process.env.ACADEMY_ADMISSION_MODE = "invite";
process.env.SESSION_SECRET = randomBytes(48).toString("hex");
const suffix = randomBytes(8).toString("hex");
const emailA = "academy-a-" + suffix + "@synthetic.invalid";
const emailB = "academy-b-" + suffix + "@synthetic.invalid";
const expiredEmail = "expired-" + suffix + "@synthetic.invalid";
const codeA = randomBytes(32).toString("base64url");
const codeB = randomBytes(32).toString("base64url");
const expiredCode = randomBytes(32).toString("base64url");
const password = randomBytes(24).toString("base64url");
const entry = (email:string, code:string, delta:number) => ({email,tokenHash:createHash("sha256").update(code).digest("hex"),expiresAt:new Date(Date.now()+delta).toISOString()});
const rows = [entry(emailA,codeA,3600000),entry(emailB,codeB,3600000),entry(expiredEmail,expiredCode,-3600000)];
process.env.ACADEMY_INVITATIONS_JSON = JSON.stringify(rows);

const pool = mysql.createPool(LAB_URL);
const app = express();
app.use(express.json({limit:"100kb"}));
app.use("/api/trpc",enforceSameOrigin);
app.use("/api/trpc",createExpressMiddleware({router:appRouter,createContext}));
const server=app.listen(0,"127.0.0.1");
type Reply={status:number;data:any;code:string|undefined;cookie:string};
let passed=0;
function pass(label:string){passed++;console.log("PASS "+label);}
try {
  await new Promise<void>((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject);});
  const origin="http://127.0.0.1:"+(server.address() as AddressInfo).port;
  async function rpc(name:string,input?:unknown,cookie="",query=false,requestOrigin=origin):Promise<Reply>{
    const url=origin+"/api/trpc/"+name+(query&&input!==undefined?"?input="+encodeURIComponent(JSON.stringify({json:input})):"");
    const res=await fetch(url,{method:query?"GET":"POST",headers:{origin:requestOrigin,"content-type":"application/json",...(cookie?{cookie}:{})},...(query?{}:{body:JSON.stringify({json:input??null})}),signal:AbortSignal.timeout(15000)});
    const body=await res.json() as any;
    return {status:res.status,data:body.result?.data?.json,code:body.error?.json?.data?.code,cookie:res.headers.get("set-cookie")?.split(";")[0]??""};
  }
  const count=async(table:"users"|"localCredentials")=>{
    const [result]=await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM "+table+" WHERE email IN (?,?,?)",[emailA,emailB,expiredEmail]);
    return Number(result[0].n);
  };
  const sign=(email:string,inviteCode?:string)=>rpc("auth.signUp",{email,password,inviteCode});
  const good=(r:Reply)=>{assert.equal(r.status,200,r.code);return r.data;};
  assert.equal(good(await rpc("auth.registrationMode",undefined,"",true)),"invite");
  for(const r of [await sign(emailA),await sign(emailA,codeB),await sign(expiredEmail,expiredCode)])
    assert.equal(r.status,403);
  assert.equal((await rpc("auth.signUp",{email:emailA,password,inviteCode:codeA},"",false,"http://wrong.invalid")).status,403);
  assert.equal(await count("users"),0);assert.equal(await count("localCredentials"),0);
  pass("invalid, missing, expired, cross-origin invites produce no database writes");

  // Remove an unused invite, prove it is denied, then restore for the lab.
  process.env.ACADEMY_INVITATIONS_JSON=JSON.stringify([rows[0]]);
  assert.equal((await sign(emailB,codeB)).status,403);
  process.env.ACADEMY_INVITATIONS_JSON=JSON.stringify(rows);
  pass("revoked unused invitation denied");

  // Stay within existing rate limit (8 requests per IP) by using exactly eight
  // same-origin registration attempts before closing signup.
  const race=await Promise.all([sign(emailA,codeA),sign(emailA,codeA)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  const cookieA=race.find(r=>r.status===200)!.cookie;
  const cookieB=(await sign(emailB,codeB)).cookie;
  assert.ok(cookieA&&cookieB&&cookieA!==cookieB);
  assert.equal(await count("users"),2);assert.equal(await count("localCredentials"),2);
  const a=good(await rpc("auth.me",undefined,cookieA,true));
  const b=good(await rpc("auth.me",undefined,cookieB,true));
  assert.equal(a.email,emailA);assert.equal(b.email,emailB);assert.notEqual(a.id,b.id);
  assert.equal(good(await rpc("auth.me",undefined,"",true)),null);
  assert.equal(good(await rpc("auth.me",undefined,cookieA+"tampered",true)),null);
  assert.ok(!("passwordHash" in a)&&!("passwordHash" in b));
  pass("concurrent duplicate registration rolls back; real JWT resolves two persisted identities");

  process.env.ACADEMY_ADMISSION_MODE="closed";
  assert.equal((await sign(expiredEmail,expiredCode)).status,403);
  const logged=await rpc("auth.signIn",{email:emailA,password});
  assert.equal(logged.status,200);assert.ok(logged.cookie);
  assert.equal((await rpc("auth.signIn",{email:emailA,password:"wrong-password"})).status,401);
  assert.equal(good(await rpc("auth.me",undefined,logged.cookie,true)).id,a.id);
  pass("closed registration retains real existing-account login");

  const profile={...supportedFirstAccessLanguages,tutorPersona:"welcoming",interest:"work",allowAIFeedback:false};
  good(await rpc("onboarding.saveProfile",{...profile,tutorName:"Tutor A"},cookieA));
  good(await rpc("onboarding.saveProfile",{...profile,tutorName:"Tutor B"},cookieB));
  good(await rpc("onboarding.submit",{taskId:firstAccessTasks[0].id,answer:"I am learner A."},cookieA));
  const snapA=good(await rpc("onboarding.me",undefined,cookieA,true));
  const snapB=good(await rpc("onboarding.me",undefined,cookieB,true));
  assert.equal(snapA.profile.tutorName,"Tutor A");assert.equal(snapA.responses.length,1);
  assert.equal(snapB.profile.tutorName,"Tutor B");assert.equal(snapB.responses.length,0);
  good(await rpc("onboarding.defer",undefined,cookieA));
  assert.equal(good(await rpc("onboarding.me",undefined,cookieA,true)).profile.onboardingStatus,"deferred");
  good(await rpc("onboarding.resume",undefined,cookieA));
  assert.equal(good(await rpc("onboarding.me",undefined,cookieA,true)).responses.length,1);
  pass("onboarding resume persists answers with isolation across real accounts");

  const item={itemKey:"lab-water",kind:"word",text:"water",normalizedText:"water",language:"en"};
  const saved=good(await rpc("learning.saveItem",item,cookieA));
  assert.equal(good(await rpc("learning.listItems",{},cookieB,true)).length,0);
  const savedB=good(await rpc("learning.saveItem",{...item,translation:"agua"},cookieB));
  assert.notEqual(saved.item.id,savedB.item.id);
  assert.equal((await rpc("learning.review",{knowledgeItemId:saved.item.id,rating:"good",operationId:"lab-cross-review"},cookieB)).status,412);
  const review={knowledgeItemId:saved.item.id,rating:"good",operationId:"lab-own-review"};
  good(await rpc("learning.review",review,cookieA));
  good(await rpc("learning.review",review,cookieA));
  assert.equal(good(await rpc("learning.history",{},cookieA,true)).length,1);
  assert.equal(good(await rpc("learning.history",{},cookieB,true)).length,0);
  pass("private learning items, cross-account rejection and review idempotency");

  const fact={fato:"Quero aprender inglês para trabalhar",categoria:"objetivo",sourceMessage:"Quero aprender inglês para trabalhar",consent:true};
  assert.notEqual((await rpc("tutor.memorySave",{...fact,consent:false},cookieA)).status,200);
  good(await rpc("tutor.memorySave",fact,cookieA));
  const memories=good(await rpc("tutor.memoryList",undefined,cookieA,true));
  assert.equal(memories.length,1);
  assert.deepEqual(good(await rpc("tutor.memoryList",undefined,cookieB,true)),[]);
  good(await rpc("tutor.memoryDelete",{id:memories[0].id},cookieB));
  assert.equal(good(await rpc("tutor.memoryList",undefined,cookieA,true)).length,1);
  good(await rpc("tutor.memoryDelete",{id:memories[0].id},cookieA));
  assert.deepEqual(good(await rpc("tutor.memoryList",undefined,cookieA,true)),[]);
  pass("explicit memory consent, private retrieval and owner-only deletion");
  assert.equal((await rpc("onboarding.me",undefined,"",true)).status,401);
  console.log("Academy MySQL HTTP lab: "+passed+"/7");
} finally {
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await pool.end();
}
// The production DB module intentionally retains its pool for server lifetime;
// this standalone CI process exits after assertions and explicit lab cleanup.
process.exit(0);
