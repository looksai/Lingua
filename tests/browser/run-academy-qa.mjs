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
async function test(name,width,mode,body,fixture="public"){
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
      if(name==="auth.me")return {result:{data:{json:fixture==="public"?null:{id:9001,email:"qa-visual@synthetic.invalid",name:"Aluno de teste"}}}};
      if(fixture!=="public"){
        const profile={userId:9001,tutorName:"Alex",tutorPersona:"welcoming",interest:"work",allowAIFeedback:0,interfaceLocale:"pt-BR",nativeLanguage:"pt",targetLanguage:"en",onboardingStatus:fixture==="diagnostic"?"started":"deferred"};
        const plan={title:"Apresentações e perguntas",objective:"Praticar mensagens curtas em inglês.",context:"comunicação profissional",reason:"Ponto de partida exploratório.",limits:"Não certifica proficiência."};
        const nextTask={id:"introduce-yourself-v1",skill:"writing",message:"Como você se apresentaria em inglês?",purpose:"Apresentação"};
        const fixtures={"onboarding.me":{profile:fixture==="onboarding"?null:profile,responses:[],nextTask:fixture==="diagnostic"?nextTask:null,plan:fixture==="onboarding"?null:plan},"learning.listItems":[],"learning.history":[],"placement.me":{answers:[],plan:null,source:null,nextTask:null,status:"in_progress",skills:{writing:"sampled",reading:"not_assessed",listening:"not_assessed",speaking:"not_assessed"}},"tutor.capabilities":{provider:"off",chat:false,asr:false,tts:false,neuralEnglish:false,geminiDemo:false,memory:false}};
        if(Object.hasOwn(fixtures,name))return {result:{data:{json:fixtures[name]}}};
      }
      if(name==="partnerInvites.resolve" && fixture==="live")return {result:{data:{json:{title:"Inglês para entrevistas internacionais",partnerName:"Empresa de demonstração",scheduledAt:"2026-12-01T18:00:00.000Z",canWatch:true}}}};
      if(name==="partnerEvents.mine" && fixture==="partner")return {result:{data:{json:[{id:7001,name:"Empresa de demonstração",role:"owner"}]}}};
      if(name==="partnerEvents.list" && fixture==="partner")return {result:{data:{json:[{id:8001,title:"Preparação para entrevistas",visibility:"private",status:"draft",scheduledAt:"2026-12-01T18:00:00.000Z"}]}}};
      if(name==="campus.sponsors")return {result:{data:{json:fixture==="sponsor"?[{id:"synthetic-campaign",sponsor:"Empresa sintética de QA",title:"Campanha sintética",description:"Apenas teste isolado.",url:"https://example.com/"}]:[]}}};
      if(name==="auth.trialStatus")return {result:{data:{json:fixture==="expired"?{kind:"expired",expiresAtMs:1700000000000,remainingDays:0}:{kind:"active",expiresAtMs:1900000000000,remainingDays:15}}}};
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
  }catch(error){
    const safeName=name.replace(/[^a-zA-Z0-9]+/g,"-");
    await page.screenshot({path:path.join(screenshotDir,"failure-"+safeName+".png"),fullPage:true,animations:"disabled"}).catch(()=>{});
    console.error("Failed synthetic browser case:",name,"path:",new URL(page.url()).pathname,"browser errors:",errors,"broken assets:",broken);
    throw error;
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
  if(geometry.width<=1100) assert.equal(geometry.preview,"none","avoid photo overlay in narrow and intermediate viewports");
  assert.equal(await page.getByRole("link",{name:"Conhecer o método"}).getAttribute("href"),"#metodo");
  assert.equal(await page.locator('a[href="/demo"]').count(),0);
  await page.screenshot({path:path.join(screenshotDir,`landing-${page.viewportSize().width}.png`),fullPage:true,animations:"disabled"});
  await page.getByRole("link",{name:"Começar agora"}).click();
  await page.getByRole("heading",{name:"Crie sua conta"}).waitFor();
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
  await test("keyboard focus remains visible and retired demo redirects",1440,"invite",async page=>{
    await page.goto(base);
    await page.getByRole("heading",{name:/Inglês que conecta você/}).waitFor();
    await page.keyboard.press("Tab");
    const focus=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(focus,"none");
    await page.goto(base+"/demo");
    await page.getByRole("heading",{name:"Crie sua conta"}).waitFor();
    assert.ok(page.url().includes("/login?mode=signup"));
  });
  for(const width of [375,1440]){
    await test("retired demo blocks closed registration "+width,width,"closed",async page=>{
      await page.goto(base+"/demo");await page.getByText("Novos cadastros estão temporariamente fechados.").waitFor();
      assert.equal(await page.getByRole("button",{name:"Cadastrar"}).isEnabled(),false);
      assert.equal(await page.locator(".academy-demo-main").count(),0);await fit(page);
    });
    for(const fixture of ["onboarding","diagnostic","student"]){
      await test("synthetic "+fixture+" "+width,width,"closed",async page=>{
        await page.goto(base);
        await page.locator(fixture==="student"?".academy-welcome":".academy-onboarding-card").waitFor();
        if(fixture==="student"){
          await page.locator(".academy-dashboard-v3").waitFor();
          await page.getByText("Nenhum destaque patrocinado publicado.").waitFor();
          await page.getByRole("button",{name:"Dispensar saudação"}).waitFor();
          await page.locator(".academy-tutor-trigger").click();
          await page.getByRole("button",{name:"Minimizar tutor"}).click();
          assert.equal(await page.getByRole("button",{name:"Dispensar saudação"}).count(),0);
          assert.equal(await page.locator(".academy-campus-areas button").count(),5);
          await page.getByRole("searchbox").count();
          const search=page.getByRole("textbox",{name:"Buscar áreas do Lingua"});
          await search.fill("Imigração");assert.equal(await page.locator(".academy-campus-areas button").count(),1);await search.fill("");
          await page.locator(".academy-campus-areas .area-imigracao").click();await page.getByRole("status").filter({hasText:"área em preparação"}).waitFor();await page.getByRole("button",{name:"Fechar aviso"}).click();
          assert.equal(await page.locator(".academy-tutor-window").count(),0);
          const geometry=await page.evaluate(()=>{
            const nav=document.querySelector(".academy-premium-nav"),main=document.querySelector(".academy-premium-main");
            const a=nav.getBoundingClientRect(),b=main.getBoundingClientRect();
            return {navRight:a.right,navTop:a.top,navBottom:a.bottom,mainLeft:b.left,mainTop:b.top,mainBottom:b.bottom,headerBottom:document.querySelector(".academy-premium-topbar").getBoundingClientRect().bottom,navColor:getComputedStyle(nav).backgroundColor,mainColor:getComputedStyle(document.querySelector(".academy-premium")).backgroundColor,ctaColor:getComputedStyle(document.querySelector(".academy-premium-hero .academy-primary")).backgroundColor};
          });
          assert.equal(geometry.navColor,"rgb(11, 31, 58)");
          assert.equal(geometry.mainColor,"rgb(248, 250, 252)");
          assert.equal(geometry.ctaColor,"rgb(245, 166, 35)");
          if(width>=1001){assert.ok(geometry.mainLeft>=geometry.navRight-1);assert.ok(Math.abs(geometry.navTop-geometry.headerBottom)<=1,"desktop sidebar must start immediately below header");assert.ok(geometry.navBottom>=geometry.mainBottom-1,"desktop sidebar must cover full content height");}
          if(width>1200){const g=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();const a=rect(".academy-dashboard-plan"),b=rect(".campus-event"),c=rect(".academy-campus-editorial-stack");return {sameRow:Math.abs(a.top-b.top)<2&&Math.abs(b.top-c.top)<2,ordered:a.right<=b.left&&b.right<=c.left}});assert.ok(g.sameRow&&g.ordered,"approved three-column layout");}
          else assert.ok(geometry.mainTop>=geometry.navBottom-1);
          await page.getByRole("button",{name:"Abrir conversa",exact:true}).click();
          const minimize=page.getByRole("button",{name:"Minimizar tutor"});
          await minimize.waitFor({state:"visible"});
          await page.screenshot({path:path.join(screenshotDir,`tutor-${width}.png`),fullPage:false,animations:"disabled"});
          await minimize.click();
          await page.locator(".academy-tutor-window").waitFor({state:"hidden"});
        }
        await fit(page);
        await page.screenshot({path:path.join(screenshotDir,`${fixture}-${width}.png`),fullPage:true,animations:"disabled"});
        if(fixture==="student"){
          await page.getByRole("navigation",{name:"Meu espaço"}).getByRole("button",{name:"Estudar",exact:true}).click();
          await page.getByRole("heading",{name:"Estudar",exact:true}).waitFor();
          assert.equal(await page.locator(".study-levels article").count(),3);
          assert.equal(await page.locator(".study-specializations button").count(),4);
          await page.getByRole("button",{name:/Inglês Profissional/}).click();
          await page.getByRole("status").filter({hasText:"área em preparação"}).waitFor();
          await page.getByRole("button",{name:"Fechar aviso"}).click();
          await fit(page);
          await page.screenshot({path:path.join(screenshotDir,`study-${width}.png`),fullPage:true,animations:"disabled"});
          await page.getByRole("button",{name:/Leitura e vocabulário/}).click();
          await page.locator(".academy-reading-studio").waitFor();
          for(const [label,file] of [["Ler e praticar","reading"],["Revisar","review"],["Meu tutor","settings"]]){
            await page.getByRole("navigation",{name:"Meu espaço"}).getByRole("button",{name:label}).click();
            await page.locator(file==="reading"?".academy-reading-studio":file==="review"?".academy-review-studio":".academy-settings-layout").waitFor();
            if(file==="reading"){
              const word=page.locator(".reading-word.known").first();
              await word.click();
              await page.locator(".academy-word-panel .academy-word-enter").waitFor();
              await page.getByRole("button",{name:"Recomeçar leitura"}).click();
              await page.getByText("Salve uma palavra durante a leitura para abrir a primeira revisão.").waitFor();
              await page.getByRole("navigation",{name:"Atalhos do estúdio"}).getByRole("button",{name:"Vocabulário"}).click();
              assert.equal(await page.evaluate(()=>document.activeElement?.id),"academy-reading-word");
              await page.getByRole("navigation",{name:"Atalhos do estúdio"}).getByRole("button",{name:"Compreensão"}).click();
              assert.equal(await page.evaluate(()=>document.activeElement?.id),"academy-reading-check");
              await page.evaluate(()=>window.scrollTo(0,0));
              assert.equal(await page.getByRole("button",{name:"Registrar e seguir"}).count(),0);
            }
            if(file==="review"){
              await page.getByRole("button",{name:"Todos os salvos"}).click();
              assert.equal(await page.getByRole("button",{name:"Todos os salvos"}).getAttribute("aria-pressed"),"true");
              await page.locator(".academy-review-stats").waitFor();
              await page.getByRole("heading",{name:"Tudo em dia nesta visão."}).waitFor();
              assert.equal(await page.locator(".academy-review-stats strong").first().innerText(),"0");
            }
            await fit(page);await page.screenshot({path:path.join(screenshotDir,`${file}-${width}.png`),fullPage:true,animations:"disabled"});
            await page.emulateMedia({reducedMotion:"reduce"});
            assert.equal(await page.locator(".academy-view-enter").evaluate(el=>getComputedStyle(el).animationName),"none");
            await page.emulateMedia({reducedMotion:"no-preference"});
          }
        }
      },fixture);
    }
  }
  await test("approved sponsor placement clearly identified",1440,"closed",async(page)=>{
    await page.goto(base);const slot=page.getByRole("region",{name:"Destaques patrocinados"});
    await slot.getByText("Patrocinado · Empresa sintética de QA").waitFor();
    const link=slot.getByRole("link",{name:"Conhecer o parceiro"});assert.equal(await link.getAttribute("href"),"https://example.com/");assert.ok((await link.getAttribute("rel")).includes("sponsored"));await fit(page);
  },"sponsor");
  await test("expired trial does not load learner profile",375,"closed",async(page,calls)=>{
    await page.goto(base);await page.getByRole("heading",{name:"Seus 15 dias gratuitos terminaram."}).waitFor();
    assert.ok(!calls.includes("onboarding.me"));await fit(page);
  },"expired");
  if(process.env.LINGUA_QA_EXPERIMENTAL_ROUTES==="1"){
    for(const width of [375,1440]){
      await test("synthetic corporate events "+width,width,"closed",async page=>{
        await page.goto(base+"/partners");
        await page.getByRole("heading",{name:"Painel empresarial"}).waitFor();
        await page.getByRole("heading",{name:"Preparação para entrevistas"}).waitFor();
        await fit(page);
        await page.screenshot({path:path.join(screenshotDir,`partner-${width}.png`),fullPage:true,animations:"disabled"});
      },"partner");
      await test("synthetic live waiting room "+width,width,"closed",async page=>{
        await page.goto(base+"/live#"+"A".repeat(43));
        await page.getByRole("heading",{name:"Inglês para entrevistas internacionais"}).waitFor();
        await page.getByText(/transmissão de vídeo ainda não está disponível/).waitFor();
        await fit(page);
        await page.screenshot({path:path.join(screenshotDir,`live-${width}.png`),fullPage:true,animations:"disabled"});
      },"live");
    }
  }
  console.log("Academy Chromium: "+passed+"/"+(process.env.LINGUA_QA_EXPERIMENTAL_ROUTES==="1"?24:20));
}finally{await browser.close();}
