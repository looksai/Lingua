import assert from "node:assert/strict";
import path from "node:path";
import {mkdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";

const dir=process.env.LINGUA_QA_PLAYWRIGHT_DIR||"/tmp/lingua-browser-tools";
const {chromium}=await import(pathToFileURL(path.join(dir,"node_modules/playwright/index.mjs")).href);
const base="http://127.0.0.1:4185";
for(let i=0;i<60;i++){
  try{if((await fetch(base,{signal:AbortSignal.timeout(1500)})).ok)break;}catch{}
  if(i===59)throw Error("Academy preview did not start");
  await new Promise(r=>setTimeout(r,250));
}
const screenshotDir=path.resolve("qa-artifacts/academy");
await mkdir(screenshotDir,{recursive:true});
const browser=await chromium.launch({headless:true});
let passed=0;
async function test(name,width,mode,body){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[],calls=[],broken=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.url().startsWith(base+"/academy/")&&!r.ok())broken.push(r.url());});
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==base)return route.abort("blockedbyclient");
    if(!url.pathname.startsWith("/api/trpc/"))return route.continue();
    const names=url.pathname.slice("/api/trpc/".length).split(",");
    calls.push(...names);
    const reply=names.map(name=>{
      if(name==="auth.me")return {result:{data:{json:null}}};
      if(name==="auth.registrationMode")return {result:{data:{json:mode}}};
      throw Error("Unexpected API call in public Academy fixture: "+name);
    });
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(url.searchParams.has("batch")?reply:reply[0])});
  });
  try{
    await body(page,calls);
    assert.deepEqual(errors,[],"uncaught browser errors");
    assert.deepEqual(broken,[],"failed approved assets");
    passed++;
    console.log("PASS "+name);
  }finally{await context.close();}
}
const fit=async page=>{
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));
};
async function landing(page){
  await page.goto(base,{waitUntil:"networkidle"});
  await page.getByRole("heading",{name:/Inglês que conecta você/}).waitFor();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll(".academy-landing img")).every(img=>img.complete&&img.naturalWidth>0));
  await fit(page);
  assert.equal(await page.locator(".academy-benefits article").count(),4);
  const hero=await page.evaluate(()=>{
    const el=document.querySelector(".academy-hero");
    return [getComputedStyle(el).backgroundImage,getComputedStyle(el,"::before").backgroundImage,getComputedStyle(el,"::after").backgroundImage].join(" ");
  });
  assert.ok(hero.includes("hero-sem-interface.webp"));
  const geometry=await page.evaluate(()=>{
    const bounds=sel=>document.querySelector(sel).getBoundingClientRect();
    return {width:innerWidth,hero:bounds(".academy-hero").height,benefits:bounds(".academy-benefits").top,banner:bounds(".academy-partners").top,preview:getComputedStyle(document.querySelector(".academy-preview")).display,photo:getComputedStyle(document.querySelector(".academy-hero"),"::after").display};
  });
  if(geometry.width>=1101 && geometry.width<=1920){
    assert.ok(geometry.benefits/geometry.width<0.36,"desktop benefits must stay near reference hero boundary");
    assert.ok(geometry.banner/geometry.width<0.44,"desktop partner banner must remain near reference position");
  }
  if(geometry.width<=950) assert.equal(geometry.preview,"none","avoid photo overlay in narrow viewport");
  assert.equal(await page.getByRole("link",{name:"Ver como funciona"}).getAttribute("href"),"/demo");
  await page.screenshot({path:path.join(screenshotDir,`landing-${page.viewportSize().width}.png`),fullPage:true,animations:"disabled"});
  await page.getByRole("link",{name:"Começar agora"}).click();
  await page.getByRole("heading",{name:"Bem-vindo ao Lingua"}).waitFor();
  await fit(page);
  await page.screenshot({path:path.join(screenshotDir,`login-${page.viewportSize().width}.png`),fullPage:true,animations:"disabled"});
}
try{
  for(const width of [320,375,768,1024,1440,1672]){
    await test("landing and login fit "+width+"px",width,"invite",landing);
  }
  await test("invite form is required and does not leak codes when switching modes",375,"invite",async(page,calls)=>{
    await page.goto(base+"/login");
    await page.getByRole("button",{name:"Tenho um convite"}).click();
    const code=page.getByLabel("Código do convite");
    assert.equal(await code.getAttribute("type"),"password");
    assert.equal(await code.getAttribute("required"),"");
    await page.getByLabel("E-mail").fill("browser@synthetic.invalid");
    await page.getByLabel("Senha",{exact:true}).fill("synthetic-password");
    await page.getByRole("button",{name:"Cadastrar"}).click();
    assert.equal(await code.evaluate(el=>el.validity.valueMissing),true);
    assert.ok(!calls.includes("auth.signUp"));
    await code.fill("A".repeat(43));
    await page.getByRole("button",{name:"Já tenho conta"}).click();
    await page.getByRole("button",{name:"Tenho um convite"}).click();
    assert.equal(await code.inputValue(),"");
    await fit(page);
  });
  await test("closed mode keeps login and hides sign-up",375,"closed",async page=>{
    await page.goto(base+"/login");
    await page.getByText("Novos cadastros estão temporariamente fechados.").waitFor();
    assert.equal(await page.getByRole("button",{name:"Entrar",exact:true}).isEnabled(),true);
    assert.equal(await page.getByRole("button",{name:"Tenho um convite"}).count(),0);
    assert.equal(await page.getByRole("button",{name:"Criar uma conta"}).count(),0);
  });
  await test("open legacy mode offers registration without code",768,"open",async page=>{
    await page.goto(base+"/login");
    await page.getByRole("button",{name:"Criar uma conta"}).click();
    await page.getByRole("heading",{name:"Crie sua conta"}).waitFor();
    assert.equal(await page.getByLabel("Código do convite").count(),0);
  });
  await test("keyboard focus remains visible and demo is explicitly fictitious",1440,"invite",async page=>{
    await page.goto(base);
    await page.getByRole("heading",{name:/Inglês que conecta você/}).waitFor();
    await page.keyboard.press("Tab");
    const focus=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(focus,"none");
    await page.getByRole("link",{name:"Ver como funciona"}).click();
    await page.getByText(/DEMONSTRAÇÃO FICTÍCIA/).waitFor();
  });
  console.log("Academy Chromium: "+passed+"/10");
}finally{await browser.close();}
