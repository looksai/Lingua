import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
import path from "node:path";

const moduleDir=process.env.LINGUA_QA_PLAYWRIGHT_DIR||"/tmp/lingua-browser-tools";
const playwrightUrl=pathToFileURL(path.join(moduleDir,"node_modules/playwright/index.mjs")).href;
const {chromium}=await import(playwrightUrl);
const BASE="http://127.0.0.1:4178/qa/catalog-ui.html";

async function serverReady(){
  for(let count=0;count<60;count++){
    try{
      const response=await fetch(BASE,{redirect:"error",signal:AbortSignal.timeout(1800)});
      if(response.ok)return;
    }catch{/* waiting for isolated Vite server */}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error("Isolated QA Vite server did not start");
}
await serverReady();
const browser=await chromium.launch({headless:true});
let passed=0;

async function test(name,body,{viewport={width:1280,height:800},noObserver=false}={}){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  // The fixture is wholly local. No requests to login, Render, Groq or Aiven.
  await page.route("**/*",route=>{
    const url=new URL(route.request().url());
    if(url.protocol==="http:"&&url.hostname==="127.0.0.1"&&url.port==="4178")
      return route.continue();
    return route.abort("blockedbyclient");
  });
  if(noObserver)await page.addInitScript(()=>{
    Object.defineProperty(window,"IntersectionObserver",{value:undefined,configurable:true});
  });
  try{
    await page.goto(BASE,{waitUntil:"networkidle",timeout:25000});
    await page.getByRole("heading",{name:"Lingua — laboratório de navegador sem dados pessoais"}).waitFor();
    await body(page);
    passed++;
    console.log("PASS "+name);
  }catch(error){
    console.error("FAIL "+name);
    console.error(error);
    throw error;
  }finally{await context.close();}
}

const ack=async page=>Number(await page.getByTestId("ack-count").textContent());
const awaitAck=async(page,num)=>page.waitForFunction(n=>
  Number(document.querySelector('[data-testid="ack-count"]')?.textContent)===n,num);

try {
  await test("card receives one viewport receipt, no duplicate on repeat scroll",async page=>{
    assert.equal(await ack(page),0,"offscreen task cannot have an ACK");
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await awaitAck(page,1);
    assert.equal(await page.getByRole("region",{name:"Atividade do catálogo do Lingua"}).count(),1);
    assert.equal(await page.getByText("Na frase Hello, qual é o significado?").count(),1);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    assert.equal(await ack(page),1,"reactive re-render must not submit another receipt");
  });
  await test("failed ACK can be retried manually, without fake success",async page=>{
    await page.getByTestId("reject-ack").check();
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await awaitAck(page,1);
    await page.getByText("A confirmação não chegou ao servidor.",{exact:false}).waitFor();
    await page.getByTestId("reject-ack").uncheck();
    await page.getByRole("button",{name:"Confirmar que a atividade apareceu"}).click();
    await awaitAck(page,2);
    await page.getByText("A confirmação não chegou ao servidor.",{exact:false}).waitFor({state:"hidden"});
  });
  await test("without IntersectionObserver only an explicit learner click reports rendering",async page=>{
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    assert.equal(await ack(page),0);
    await page.getByRole("button",{name:"Confirmar que a atividade apareceu"}).click();
    await awaitAck(page,1);
  },{noObserver:true});
  await test("inactive consent/area denies automatic and manual ACK",async page=>{
    await page.getByTestId("active").uncheck();
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    assert.equal(await ack(page),0);
    assert.equal(await page.getByRole("button",{name:"Confirmar que a atividade apareceu"}).isDisabled(),true);
    await page.getByTestId("active").check();
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await awaitAck(page,1);
  });
  await test("mismatched server task text never shows confirm action",async page=>{
    await page.getByTestId("mismatch").check();
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    assert.equal(await ack(page),0);
    assert.equal(await page.getByRole("region",{name:"Atividade do catálogo do Lingua"}).count(),0);
    assert.equal(await page.getByRole("button",{name:"Confirmar que a atividade apareceu"}).count(),0);
  });
  await test("real audio buttons fire callbacks and honor recording lock",async page=>{
    await page.getByRole("button",{name:"Ouvir frase em inglês de Naruto"}).click();
    assert.equal(await page.getByTestId("neural-clicks").textContent(),"1");
    await page.getByTestId("audio-action").selectOption("local");
    await page.getByRole("button",{name:"Ouvir pela voz local de Naruto"}).click();
    assert.equal(await page.getByTestId("local-clicks").textContent(),"1");
    await page.getByTestId("audio-action").selectOption("welcome");
    await page.getByRole("button",{name:"Preparar áudio das boas-vindas de Naruto"}).click();
    assert.equal(await page.getByTestId("welcome-clicks").textContent(),"1");
    await page.getByTestId("recording").check();
    assert.equal(await page.getByRole("button",{name:"Preparar áudio das boas-vindas de Naruto"}).isDisabled(),true);
    await page.getByTestId("recording").uncheck();
    await page.getByTestId("permission").check();
    assert.equal(await page.getByRole("button",{name:"Preparar áudio das boas-vindas de Naruto"}).isDisabled(),true);
    await page.getByTestId("permission").uncheck();
    await page.getByTestId("audio-action").selectOption("none");
    assert.equal(await page.locator('button[aria-label*="Naruto"]').count(),0);
    await page.getByTestId("audio-action").selectOption("retry");
    assert.equal(await page.getByRole("button",{name:"Tentar novamente áudio de Naruto"}).count(),1);
  });
  await test("small mobile viewport still reports visible task exactly once",async page=>{
    assert.equal(await ack(page),0);
    await page.getByTestId("catalog-card").scrollIntoViewIfNeeded();
    await awaitAck(page,1);
    assert.equal(await page.getByText("Na frase Hello, qual é o significado?").count(),1);
  },{viewport:{width:390,height:844}});
  console.log(`Browser component QA: ${passed}/7 cases passed in headless Chromium (no login or backend).`);
}catch(error){
  process.exitCode=1;
}finally{
  await browser.close();
}
