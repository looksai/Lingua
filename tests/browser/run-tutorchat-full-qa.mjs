import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
import path from "node:path";

const root=process.env.LINGUA_QA_PLAYWRIGHT_DIR||"/tmp/lingua-browser-tools";
const {chromium}=await import(pathToFileURL(path.join(root,"node_modules/playwright/index.mjs")).href);
const BASE="http://127.0.0.1:4181/qa/tutorchat-full.html";

async function ready(){
  for(let i=0;i<60;i++){
    try{
      const res=await fetch(BASE,{signal:AbortSignal.timeout(1500)});
      if(res.ok)return;
    }catch{/* local isolated Vite still starting */}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error("Full TutorChat QA Vite did not start");
}
await ready();
const browser=await chromium.launch({headless:true});
let passed=0;
async function test(label,fn){
  const ctx=await browser.newContext({viewport:{width:1024,height:780}});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push("pageerror: "+error.message));
  page.on("console",message=>{
    if(message.type()==="error")errors.push("console: "+message.text());
  });
  page.on("requestfailed",request=>errors.push("network: "+request.url()+" : "+request.failure()?.errorText));
  await page.route("**/*",route=>{
    const u=new URL(route.request().url());
    if(u.protocol==="http:"&&u.hostname==="127.0.0.1"&&u.port==="4181")
      return route.continue();
    return route.abort("blockedbyclient");
  });
  try{
    await page.goto(BASE,{waitUntil:"networkidle"});
    await page.getByRole("complementary",{name:"Chat com Naruto"}).waitFor({timeout:18000});
    await fn(page);
    passed++;
    console.log("PASS "+label);
  }catch(e){
    console.error("FAIL "+label);
    console.error(e);
    console.error("Browser errors: "+JSON.stringify(errors.slice(0,12)));
    console.error("Browser body: "+String(await page.locator("body").innerText().catch(()=>"(body unreadable)")).slice(0,900));
    throw e;
  }finally{await ctx.close();}
}
const callCount=(page,name)=>page.evaluate(n=>window.__tutorChatQa.calls().filter(x=>x.name===n).length,name);
const waitCall=(page,n)=>page.waitForFunction(n=>
  window.__tutorChatQa.calls().filter(x=>x.name==="reply").length>=n,n);
async function send(page,text){
  await page.getByRole("textbox",{name:"Sua mensagem"}).fill(text);
  await page.getByRole("button",{name:"Enviar mensagem"}).click();
}
async function acceptForFirstSend(page){
  await send(page,"Quero aprender Hello");
  await page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button",{name:"Aceitar e enviar"}).click();
  await waitCall(page,1);
  await page.getByText("Resposta sintética Naruto:",{exact:false}).waitFor();
}
try{
  await test("full TutorChat blocks external data before independent consent",async page=>{
    await send(page,"Meu primeiro exemplo");
    await page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
    assert.equal(await callCount(page,"reply"),0);
    assert.equal(await page.getByRole("button",{name:"Aceitar e enviar"}).isDisabled(),true);
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page.getByRole("button",{name:"Aceitar e enviar"}).click();
    await waitCall(page,1);
    await page.getByText("Resposta sintética Naruto:",{exact:false}).waitFor();
    const calls=await page.evaluate(()=>window.__tutorChatQa.calls().filter(c=>c.name==="reply"));
    assert.equal(calls[0].input.consent,true);
    assert.equal(calls[0].input.message,"Meu primeiro exemplo");
    assert.equal(calls[0].input.inputModality,"typed");
  });

  await test("late async reply from account A cannot leak into account B",async page=>{
    await acceptForFirstSend(page);
    await page.evaluate(()=>window.__tutorChatQa.holdNextReply());
    await send(page,"Mensagem exclusiva da conta A");
    await page.waitForFunction(()=>window.__tutorChatQa.pendingCount()===1);
    await page.getByTestId("qa-switch").click();
    await page.getByTestId("qa-account").getByText("qa-b@synthetic.invalid").waitFor();
    await page.evaluate(()=>window.__tutorChatQa.resolveHeldReply());
    await page.waitForFunction(()=>window.__tutorChatQa.pendingCount()===0);
    await page.getByRole("textbox",{name:"Sua mensagem"}).fill("Conta B precisa de consentimento");
    await page.getByRole("button",{name:"Enviar mensagem"}).click();
    await page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
    assert.equal(await page.getByText("Resposta atrasada da conta anterior",{exact:false}).count(),0);
    assert.equal(await page.getByText("Mensagem exclusiva da conta A",{exact:false}).count(),0);
    assert.equal(await callCount(page,"reply"),2,"new account must not auto-send");
  });

  await test("revoking consent suppresses an already in-flight tutor reply",async page=>{
    await acceptForFirstSend(page);
    await page.evaluate(()=>window.__tutorChatQa.holdNextReply());
    await send(page,"Texto durante revogação");
    await page.waitForFunction(()=>window.__tutorChatQa.pendingCount()===1);
    await page.getByRole("button",{name:"Configurações de conversa e voz"}).click();
    await page.getByRole("button",{name:"Desativar envio à IA"}).click();
    await page.evaluate(()=>window.__tutorChatQa.resolveHeldReply(
      "Resposta antiga após revogação — NÃO EXIBIR"));
    await page.waitForFunction(()=>window.__tutorChatQa.pendingCount()===0);
    await page.getByRole("button",{name:"Voltar à conversa"}).click();
    assert.equal(await page.getByText("Resposta antiga após revogação",{exact:false}).count(),0);
    await send(page,"Novo texto após revogação");
    await page.getByRole("dialog",{name:"Autorização da conversa"}).waitFor();
    assert.equal(await callCount(page,"reply"),2);
  });

  await test("chat memory and topic bookmark require separate opt-ins; erase clears local chat",async page=>{
    await acceptForFirstSend(page);
    await page.getByRole("button",{name:"Configurações de conversa e voz"}).click();
    const checkboxes=page.getByRole("region",{name:"Preferências da conversa"}).getByRole("checkbox");
    // The two consent toggles are separate from external provider permission.
    const memory=page.getByText("Guardar mensagens de texto neste navegador por até 30 dias");
    const bookmark=page.getByText("Lembrar somente qual assunto estudei por até 7 dias neste aparelho");
    await memory.click();await bookmark.click();
    const keys=await page.evaluate(()=>Object.keys(localStorage));
    assert(keys.some(k=>k.includes("study-topic-choice:")));
    assert(keys.some(k=>k.includes("tutor-memory-choice")||k.includes("tutor-conversation")));
    await page.getByRole("button",{name:"Apagar conversa e marcador neste aparelho"}).click();
    await page.getByRole("button",{name:"Voltar à conversa"}).click();
    assert.equal(await page.getByText("Resposta sintética Naruto:",{exact:false}).count(),0);
    await page.getByRole("status").getByText("Histórico apagado neste dispositivo.",{exact:false}).waitFor();
  });

  await test("neural voice rejection shows honest fallback without forged audio",async page=>{
    await acceptForFirstSend(page);
    await page.getByRole("button",{name:"Ouvir frase em inglês de Naruto"}).click();
    await page.getByText("Voz neural indisponível.",{exact:false}).waitFor();
    assert.equal(await callCount(page,"neuralEnglish"),1);
    assert.equal(await page.locator("audio").count(),0);
  });

  console.log("Full TutorChat browser QA: "+passed+"/5 passed, real component, fake hooks, no HTTP/DB.");
}catch(e){process.exitCode=1;}
finally{await browser.close();}
