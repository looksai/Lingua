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
  let examGoal=null,examCleared=false;
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
      if(fixture==="durable-exam"||fixture==="exam-proposals"){
        const answer=payload=>({result:{data:{json:payload}}});
        const input=(url.searchParams.has("batch")?JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}")[String(names.indexOf(name))]:JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}"))?.json??{};
        if(name==="exams.overview")return answer({plan:"lingua",catalog:[],pilot:true,durable:true,proposals:fixture==="exam-proposals"});
        if(name==="exams.practiceProposals")return answer([{version:"exam-practice-proposals-v1",source:"lingua-local-rule",variant:input.variant,skill:"reading",exerciseId:"qa-new",reason:"practice-more-contexts",observedDistinctSets:1,authority:"practice-only"}]);
        if(name==="exams.history")return answer({goal:examGoal,activities:examCleared?[]:[{attemptId:"00000000-0000-4000-8000-000000000001",variant:"ielts-general",skill:"reading",mode:"practice",exerciseId:"qa-reading",contentVersion:"qa-v1",correct:3,total:4,completedAtMs:Date.now()}]});
        if(name==="exams.saveGoal"){assert.equal(input.targetBandHalfSteps,14);examGoal={...input,updatedAtMs:Date.now()};return answer({saved:true});}
        if(name==="exams.exercises")return answer(fixture==="exam-proposals"?[{id:"qa-new",title:"Suggested original reading"}]:[]);
        if(name==="exams.resume")return answer(examCleared?null:{id:"00000000-0000-4000-8000-000000000002",variant:"ielts-general",mode:"practice",version:"qa-v1",deadline:Date.now()+60000,exercise:{id:"qa-reading",skill:"reading",title:"Resumed original reading",passage:"A short notice.",questions:[{id:"qa1",prompt:"Read the notice.",options:["Yes","No"]}]}});
        if(name==="exams.clearHistory"){assert.equal(input.confirm,true);examGoal=null;examCleared=true;return answer({cleared:true});}
      }
      if(fixture==="speaking-authorized"||fixture==="speaking-sequence"){
        const answer=payload=>({result:{data:{json:payload}}});
        if(name==="exams.overview")return answer({plan:"community",catalog:[],pilot:true});
        if(name==="exams.speakingPrompts")return answer({version:"qa",prompts:fixture==="speaking-sequence"?["part1-work","part1-travel","part2-skill","part3-learning","part3-cities","part1-food","part1-reading","part2-help","part3-community","part3-habits"].map((id,i)=>({id,part:[1,1,2,3,3][i%5],title:"QA "+id,question:"Question "+(i+1),preparationSeconds:i%5===2?60:0,practiceSeconds:120,review:["Did I give an example?"]})):[{id:"qa-speaking",part:2,title:"A useful skill",question:"Describe a useful skill.",preparationSeconds:60,practiceSeconds:120,review:["Did I give an example?"]}],criteria:[{name:"Pronúncia",description:"Escute sua gravação."}]});
      }
      if(fixture==="writing-sequence"){
        const answer=payload=>({result:{data:{json:payload}}});
        if(name==="exams.overview")return answer({plan:"lingua",catalog:[],pilot:true});
        if(name==="exams.writingTasks")return answer([{id:"sequence-1",variant:"ielts-academic",kind:1,title:"First writing task",prompt:"Describe the fictional table.",minimumWords:150,recommendedMinutes:20,reviewQuestions:["Did I summarise the trends?"]},{id:"sequence-2",variant:"ielts-academic",kind:2,title:"Second writing task",prompt:"Discuss both opinions.",minimumWords:250,recommendedMinutes:40,reviewQuestions:["Did I give my opinion?"]},{id:"sequence-3",variant:"ielts-academic",kind:1,setId:"set-2",title:"Alternate first task",prompt:"Describe the fictional figures.",minimumWords:150,recommendedMinutes:20,reviewQuestions:["Did I compare figures?"]},{id:"sequence-4",variant:"ielts-academic",kind:2,setId:"set-2",title:"Alternate second task",prompt:"Explain causes and responses.",minimumWords:250,recommendedMinutes:40,reviewQuestions:["Did I explain causes?"]}]);
        if(name==="exams.writingReview"||name==="exams.writingFeedback")throw Error("Local sequence must not transmit drafts");
      }
      if(fixture==="writing-authorized"){
        const answer=payload=>({result:{data:{json:payload}}});
        if(name==="exams.overview")return answer({plan:"lingua",catalog:[],pilot:true});
        if(name==="exams.writingTasks")return answer([{id:"qa-writing",variant:"ielts-academic",kind:1,title:"QA library visits",prompt:"Summarise the table.",minimumWords:150,recommendedMinutes:20,table:{caption:"QA fictional data",headers:["Library","Visits"],rows:[["Northbank","42"]]},reviewQuestions:["Did I include an overview?"]}]);
        if(name==="exams.writingReview"){
          const input=(url.searchParams.has("batch")?JSON.parse(route.request().postData()||"{}")[String(names.indexOf(name))]:JSON.parse(route.request().postData()||"{}"))?.json??{};
          assert.equal(input.taskId,"qa-writing");assert.equal(input.text,"The library received forty two visits.");
          return answer({version:"qa",taskId:input.taskId,wordCount:7,minimumWords:150,minimumMet:false,criteria:[{id:"task",name:"Cumprimento da tarefa",description:"Relevância"}],reviewQuestions:["Did I include an overview?"],assessment:"self-review-only"});
        }
      }
      if(fixture==="listening-extended"){
        const answer=payload=>({result:{data:{json:payload}}});
        const input=(url.searchParams.has("batch")?JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}")[String(names.indexOf(name))]:JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}"))?.json??{};
        const questions=Array.from({length:12},(_,i)=>({id:"el"+(i+1),prompt:"Question "+(i+1),options:["Yes","No"]}));
        if(name==="exams.overview")return answer({plan:"community",catalog:[],pilot:true});
        if(name==="exams.start"){assert.equal(input.exerciseId,"listening-extended-v1");assert.equal(input.skill,"listening");assert.equal(input.mode,"practice");return answer({id:"00000000-0000-4000-8000-000000000001",variant:"ielts-academic",mode:"practice",version:"listening-qa",deadline:Date.now()+1800000,exercise:{id:"listening-extended-v1",skill:"listening",title:"Listening extended fixture",passage:"",questions,sections:[0,1,2].map(i=>({title:"Audio "+(i+1),passage:"Original fictional audio script "+(i+1),questionIds:questions.slice(i*4,i*4+4).map(q=>q.id)}))}});}
        if(name==="exams.submit"){assert.equal(Object.keys(input.answers).length,12);return answer({correct:12,total:12,mode:"practice",version:"listening-qa",items:questions.map(q=>({id:q.id,correct:true,expected:"Yes",explanation:"Synthetic correction."}))});}
      }
      if(fixture==="reading-mock"){
        const answer=payload=>({result:{data:{json:payload}}});
        const input=(url.searchParams.has("batch")?JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}")[String(names.indexOf(name))]:JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}"))?.json??{};
        const questions=Array.from({length:12},(_,i)=>({id:"m"+(i+1),prompt:"Question "+(i+1),options:["Yes","No"]}));
        if(name==="exams.overview")return answer({plan:"community",catalog:[],pilot:true});
        if(name==="exams.start"){assert.equal(input.exerciseId,"reading-mock-v1");assert.equal(input.mode,"timed");return answer({id:"00000000-0000-4000-8000-000000000001",variant:"ielts-academic",mode:"timed",version:"mock-qa",deadline:Date.now()+900000,exercise:{id:"reading-mock-v1",skill:"reading",title:"Reading mock fixture",passage:"",questions,sections:[0,1,2].map(i=>({title:"Passage "+(i+1),passage:"Original fictional passage "+(i+1),questionIds:questions.slice(i*4,i*4+4).map(q=>q.id)}))}});}
        if(name==="exams.submit"){assert.equal(Object.keys(input.answers).length,12);return answer({correct:12,total:12,mode:"timed",version:"mock-qa",items:questions.map(q=>({id:q.id,correct:true,expected:"Yes",explanation:"Synthetic correction."}))});}
      }
      if(fixture==="exam-authorized"){
        const answer=payload=>({result:{data:{json:payload}}});
        const input=(url.searchParams.has("batch")?JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}")[String(names.indexOf(name))]:JSON.parse(route.request().postData()||url.searchParams.get("input")||"{}"))?.json??{};
        if(name==="exams.overview")return answer({plan:"community",catalog:[],pilot:true});
        if(name==="exams.exercises")return answer(input.skill==="listening"?[{id:"listen-qa",title:"Original listening fixture"}]:[{id:"read-qa",title:"Original reading fixture"}]);
        if(name==="exams.start"){
          assert.equal(input.skill,"listening");assert.equal(input.exerciseId,"listen-qa");assert.equal(input.mode,"practice");
          return answer({id:"00000000-0000-4000-8000-000000000001",variant:"ielts-academic",mode:"practice",version:"qa",deadline:Date.now()+60000,exercise:{id:"listen-qa",skill:"listening",title:"Original listening fixture",passage:"The bus leaves at nine.",questions:[{id:"qa1",prompt:"When does the bus leave?",options:["Eight","Nine"]}]}});
        }
        if(name==="exams.submit"){
          assert.equal(input.answers.qa1,"Nine");
          return answer({correct:1,total:1,mode:"practice",version:"qa",items:[{id:"qa1",correct:true,expected:"Nine",explanation:"The speaker says nine."}]});
        }
      }
      if(name==="exams.overview")return {result:{data:{json:{plan:null,catalog:[],pilot:true}}}};
      if(name==="campus.sponsors")return {result:{data:{json:fixture==="sponsor"?[{id:"synthetic-campaign",sponsor:"Empresa sintética de QA",title:"Campanha sintética",description:"Apenas teste isolado.",url:"https://example.com/"}]:[]}}};
      if(name==="auth.trialStatus")return {result:{data:{json:fixture==="expired"?{kind:"expired",expiresAtMs:1700000000000,remainingDays:0}:{kind:"active",expiresAtMs:1900000000000,remainingDays:15}}}};
      if(name==="auth.registrationMode")return {result:{data:{json:mode}}};
      if(name==="learning.gamificationPreview")return {result:{data:{json:{scope:"review-history-preview",totalXp:30,level:1,xpIntoLevel:30,xpPerLevel:250,achievements:[],missions:[]}}}};
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
          await page.getByRole("navigation",{name:"Meu espaço"}).getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
          await page.getByRole("heading",{name:"Exames de Proficiência",exact:true}).waitFor();
          await page.getByText("Benefício dos planos Lingua Premium e Comunidade Premium").waitFor();
          assert.equal(await page.locator(".exam-catalog button").count(),8);
          await fit(page);
          await page.screenshot({path:path.join(screenshotDir,`exams-${width}.png`),fullPage:true,animations:"disabled"});
          await page.getByRole("button",{name:/IELTS General Training/}).click();
          await page.getByRole("heading",{name:"Meu objetivo",exact:true}).waitFor();
          await page.getByRole("button",{name:"Ir ao treinamento"}).click();
          assert.equal(await page.getByRole("button",{name:"Iniciar prática",exact:true}).isEnabled(),false);
          await page.getByRole("navigation",{name:"Centro de exames"}).getByRole("button",{name:"Simulados",exact:true}).click();
          assert.equal(await page.getByRole("button",{name:"Iniciar miniatividade"}).isEnabled(),false);
          const studyMenu=page.getByRole("navigation",{name:"Meu espaço"}).getByRole("button",{name:"Estudar",exact:true});
          const subnav=page.getByRole("group",{name:"Ferramentas de estudo"});
          assert.equal(await studyMenu.getAttribute("aria-expanded"),"false");
          await studyMenu.click();
          await subnav.waitFor({state:"visible"});
          assert.equal(await studyMenu.getAttribute("aria-expanded"),"true");
          await studyMenu.click();
          await subnav.waitFor({state:"hidden"});
          await studyMenu.click();
          await subnav.getByRole("button",{name:"Meu progresso",exact:true}).click();
          await page.waitForFunction(()=>document.activeElement?.id==="study-progress-title");
          await subnav.getByRole("button",{name:"Conversação",exact:true}).click();
          await page.getByRole("button",{name:"Minimizar tutor"}).click();
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
          for(const [label,file] of [["Ler e praticar","reading"],["Revisões espaçadas","review"],["Meu tutor","settings"]]){
            await page.getByRole("navigation",{name:"Meu espaço"}).getByRole("button",{name:label}).click();
            await page.locator(file==="reading"?".academy-reading-studio":file==="review"?".academy-review-studio":".academy-settings-layout").waitFor();
            if(file!=="settings"){assert.equal(await studyMenu.getAttribute("aria-expanded"),"true");await page.locator(".academy-study-breadcrumb").waitFor();assert.equal(await subnav.getByRole("button",{name:label,exact:true}).getAttribute("aria-current"),"page");}
            else assert.equal(await studyMenu.getAttribute("aria-expanded"),"false");
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
  await test("authorized listening controls and answer submission (synthetic API and voice)",375,"closed",async(page,calls)=>{
    await page.addInitScript(()=>{
      const voice={name:"QA local English",lang:"en-GB",localService:true,voiceURI:"qa-local",default:true};
      const synth=new EventTarget();
      Object.assign(synth,{getVoices:()=>[voice],speaking:false,pending:false,speak:utterance=>{synth.speaking=true;window.__qaSpoken=utterance.text;},cancel:()=>{synth.speaking=false;}});
      Object.defineProperty(window,"speechSynthesis",{value:synth,configurable:true});
      Object.defineProperty(window,"SpeechSynthesisUtterance",{value:class{constructor(text){this.text=text;}},configurable:true});
    });
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Comunidade Premium").waitFor();
    await page.getByRole("button",{name:/Listening Compreensão auditiva/}).click();
    await page.locator(".exam-panel select").filter({has:page.locator('option[value="listen-qa"]')}).selectOption("listen-qa");
    await page.getByRole("button",{name:"Iniciar prática",exact:true}).click();
    await page.getByRole("button",{name:"Ouvir áudio"}).waitFor();
    assert.equal(await page.getByText("The bus leaves at nine.",{exact:true}).count(),0);
    await page.getByRole("button",{name:"Ouvir áudio"}).click();
    assert.equal(await page.evaluate(()=>window.__qaSpoken),"The bus leaves at nine.");
    await page.getByRole("button",{name:"Parar áudio"}).click();
    await page.getByRole("radio",{name:"Nine",exact:true}).check();
    await page.getByRole("button",{name:"Enviar respostas"}).click();
    await page.getByText("Resultado: 1/1 acertos. Não corresponde a uma nota IELTS.").waitFor();
    await page.getByText("The bus leaves at nine.",{exact:true}).waitFor();
    assert.ok(calls.includes("exams.submit"));await fit(page);
  },"exam-authorized");
  await test("authorized writing task and guided self-review (synthetic API)",375,"closed",async(page,calls)=>{
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Lingua Premium").waitFor();
    await page.getByRole("button",{name:/Writing Produção de textos/}).click();
    await page.getByRole("heading",{name:"Treinamento de Writing"}).waitFor();
    await page.getByText("QA fictional data").waitFor();
    await page.getByLabel("Seu texto em inglês").fill("The library received forty two visits.");
    await page.getByRole("button",{name:"Conferir texto e abrir autoavaliação"}).click();
    await page.getByText("7 palavras · Abaixo do mínimo.",{exact:false}).waitFor();
    await page.getByText("Did I include an overview?").waitFor();
    assert.ok(calls.includes("exams.writingReview"));await fit(page);
  },"writing-authorized");
  await test("authorized speaking practice, local recording and cleanup (synthetic microphone)",375,"closed",async(page,calls)=>{
    await page.addInitScript(()=>{
      window.__qaMicStopped=0;
      Object.defineProperty(navigator.mediaDevices,"getUserMedia",{configurable:true,value:async()=>({getTracks:()=>[{stop:()=>window.__qaMicStopped++}]})});
      Object.defineProperty(window,"MediaRecorder",{configurable:true,value:class{
        constructor(){this.state="inactive";this.mimeType="audio/webm";}
        start(){this.state="recording";}
        stop(){if(this.state!=="recording")return;this.state="inactive";queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(["qa audio"],{type:this.mimeType})});this.onstop?.();});}
      }});
    });
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Comunidade Premium").waitFor();
    await page.getByRole("button",{name:/Speaking Fluência e comunicação/}).click();
    await page.getByText("Describe a useful skill.").waitFor();
    await page.getByRole("button",{name:"Preparar por 1 minuto"}).click();
    await page.getByText(/Preparação: \d+ s/).last().waitFor();
    await page.getByRole("button",{name:"Gravar resposta"}).click();
    await page.getByRole("button",{name:"Encerrar gravação"}).click();
    await page.getByText("Escute sua resposta").waitFor();
    assert.ok((await page.locator("audio").getAttribute("src")).startsWith("blob:"));
    assert.equal(await page.evaluate(()=>window.__qaMicStopped),1);
    assert.ok(!calls.some(c=>/transcribe|speech|speakingReview/.test(c)));
    await page.getByRole("button",{name:"Descartar e praticar novamente"}).click();
    assert.equal(await page.locator("audio").count(),0);
    await fit(page);
  },"speaking-authorized");
  await test("oral sequence defers review and clears five local recordings (synthetic microphone)",375,"closed",async(page,calls)=>{
    await page.addInitScript(()=>{
      window.__qaMicStopped=0;
      const revoke=URL.revokeObjectURL.bind(URL);window.__qaRevoked=0;
      URL.revokeObjectURL=(url)=>{window.__qaRevoked++;revoke(url);};
      Object.defineProperty(navigator.mediaDevices,"getUserMedia",{configurable:true,value:async()=>({getTracks:()=>[{stop:()=>window.__qaMicStopped++}]})});
      Object.defineProperty(window,"MediaRecorder",{configurable:true,value:class{
        constructor(){this.state="inactive";this.mimeType="audio/webm";}
        start(){this.state="recording";}
        stop(){if(this.state!=="recording")return;this.state="inactive";queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(["qa audio"],{type:this.mimeType})});this.onstop?.();});}
      }});
    });
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Comunidade Premium").waitFor();
    await page.getByRole("button",{name:/Speaking Fluência e comunicação/}).click();
    await page.getByRole("button",{name:"Sequência oral guiada"}).click();
    const oralSet=page.getByLabel("Conjunto oral");
    await oralSet.selectOption("set-2");
    for(let i=6;i<=10;i++){
      await page.getByText("Question "+i,{exact:true}).waitFor();
      await page.getByRole("button",{name:"Gravar resposta"}).click();
      await page.getByRole("button",{name:"Encerrar gravação"}).click();
      await page.getByText("Resposta gravada. A revisão será exibida ao final.").waitFor();
      assert.equal(await page.locator("audio").count(),0);
      assert.equal(await oralSet.isDisabled(),true);
      await page.getByRole("button",{name:i===10?"Concluir sequência":"Próxima pergunta"}).click();
    }
    await page.getByText("5 respostas gravadas. Nenhuma nota atribuída.").waitFor();
    assert.equal(await page.locator("audio").count(),5);
    assert.equal(await page.evaluate(()=>window.__qaMicStopped),5);
    assert.ok(!calls.some(c=>/transcribe|speech|speakingReview/.test(c)));
    await page.getByRole("button",{name:"Descartar e reiniciar sequência"}).click();
    assert.equal(await page.locator("audio").count(),0);
    assert.equal(await page.evaluate(()=>window.__qaRevoked),5);
    await page.getByText("Question 6",{exact:true}).waitFor();
    assert.equal(await oralSet.isEnabled(),true);
    await oralSet.selectOption("set-1");
    await page.getByText("Question 1",{exact:true}).waitFor();await fit(page);
  },"speaking-sequence");
  await test("durable exam goal, resume and history deletion (synthetic API)",375,"closed",async(page,calls)=>{
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Lingua Premium").waitFor();
    await page.getByRole("button",{name:"Meu objetivo",exact:true}).click();
    await page.locator(".exam-panel select").filter({has:page.locator('option[value="ielts-general"]')}).selectOption("ielts-general");
    await page.locator(".exam-panel select").filter({has:page.locator('option[value="7.0"]')}).selectOption("7.0");
    await page.getByRole("button",{name:"Salvar objetivo"}).click();
    await page.getByText("Objetivo salvo.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Carregar objetivo salvo"}).click();
    await page.getByRole("button",{name:"Ir ao treinamento"}).click();
    await page.getByRole("button",{name:"Retomar tentativa ativa"}).click();
    await page.getByText("Resumed original reading",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Minha evolução",exact:true}).click();
    await page.getByText("Reading · 3/4",{exact:true}).waitFor();
    page.once("dialog",dialog=>dialog.accept());
    await page.getByRole("button",{name:"Excluir histórico e objetivo"}).click();
    await page.getByText("Nenhuma atividade objetiva registrada.",{exact:true}).waitFor();
    assert.ok(calls.includes("exams.clearHistory"));await fit(page);
  },"durable-exam");
  await test("local practice proposal selects a new context without starting automatically",375,"closed",async(page,calls)=>{
    await page.goto(base);
    await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Lingua Premium").waitFor();
    await page.getByRole("button",{name:"Minha evolução",exact:true}).click();
    await page.getByText("Pratique um contexto ainda não observado.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Selecionar prática sugerida"}).click();
    await page.locator(".exam-panel select").filter({has:page.locator('option[value="qa-new"]')}).waitFor();
    assert.equal(await page.locator(".exam-panel select").filter({has:page.locator('option[value="qa-new"]')}).inputValue(),"qa-new");
    assert.ok(!calls.includes("exams.start"));await fit(page);
  },"exam-proposals");
  await test("extended reading mock shows three passages and twelve questions before correction",375,"closed",async(page,calls)=>{
    await page.goto(base);await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Comunidade Premium").waitFor();
    await page.getByRole("button",{name:"Simulados",exact:true}).click();
    await page.getByRole("button",{name:"Iniciar Reading ampliado"}).click();
    await page.getByRole("heading",{name:"Passage 3",exact:true}).waitFor();
    assert.equal(await page.locator(".exam-question").count(),12);
    assert.equal(await page.locator(".exam-feedback").count(),0);
    for(const q of await page.locator(".exam-question").all())await q.getByRole("radio",{name:"Yes",exact:true}).check();
    await page.getByRole("button",{name:"Enviar respostas"}).click();
    await page.locator(".exam-feedback").first().waitFor();
    assert.equal(await page.locator(".exam-feedback").count(),12);
    assert.ok(calls.includes("exams.submit"));await fit(page);
  },"reading-mock");
  await test("extended Listening plays three local scripts and delays visible transcripts",375,"closed",async(page,calls)=>{
    await page.addInitScript(()=>{
      const voice={name:"QA local English",lang:"en-GB",localService:true,voiceURI:"qa-local",default:true};
      const synth=new EventTarget();
      Object.assign(synth,{getVoices:()=>[voice],speaking:false,pending:false,speak:utterance=>{synth.speaking=true;window.__qaSpoken=utterance.text;},cancel:()=>{synth.speaking=false;}});
      Object.defineProperty(window,"speechSynthesis",{value:synth,configurable:true});
      Object.defineProperty(window,"SpeechSynthesisUtterance",{value:class{constructor(text){this.text=text;}},configurable:true});
    });
    await page.goto(base);await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Comunidade Premium").waitFor();
    await page.getByRole("button",{name:"Simulados",exact:true}).click();
    await page.getByRole("button",{name:"Iniciar Listening ampliado"}).click();
    for(let i=1;i<=3;i++){
      assert.equal(await page.getByText("Original fictional audio script "+i,{exact:true}).count(),0);
      await page.getByRole("button",{name:"Ouvir áudio · Audio "+i,exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__qaSpoken),"Original fictional audio script "+i);
      await page.getByRole("button",{name:"Parar áudio",exact:true}).click();
    }
    for(const q of await page.locator(".exam-question").all())await q.getByRole("radio",{name:"Yes",exact:true}).check();
    await page.getByRole("button",{name:"Enviar respostas"}).click();
    await page.getByText("Resultado: 12/12 acertos. Não corresponde a uma nota IELTS.").waitFor();
    for(let i=1;i<=3;i++)await page.getByText("Original fictional audio script "+i,{exact:true}).waitFor();
    assert.ok(calls.includes("exams.submit"));await fit(page);
  },"listening-extended");
  await test("Writing sequence keeps both texts local and defers self-review",375,"closed",async(page,calls)=>{
    await page.goto(base);await page.getByRole("button",{name:"Exames de Proficiência",exact:true}).click();
    await page.getByText("Piloto autorizado · Lingua Premium").waitFor();
    await page.getByRole("button",{name:/Writing Produção de textos/}).click();
    await page.getByRole("button",{name:"Sequência de duas tarefas"}).click();
    await page.getByLabel("Conjunto de tarefas").selectOption("set-2");
    await page.getByRole("button",{name:"Iniciar sequência de Writing"}).click();
    await page.getByRole("heading",{name:"Alternate first task",exact:true}).waitFor();
    await page.getByRole("textbox",{name:"Seu texto em inglês"}).fill("First local draft");
    await page.getByRole("button",{name:"Task 2",exact:true}).click();
    await page.getByRole("heading",{name:"Alternate second task",exact:true}).waitFor();
    await page.getByRole("textbox",{name:"Seu texto em inglês"}).fill("Second local draft");
    await page.getByRole("button",{name:"Task 1",exact:true}).click();
    assert.equal(await page.getByRole("textbox",{name:"Seu texto em inglês"}).inputValue(),"First local draft");
    assert.equal(await page.getByText("Autoavaliação das duas tarefas",{exact:true}).count(),0);
    page.once("dialog",d=>d.accept());
    await page.getByRole("button",{name:"Encerrar sequência e revisar"}).click();
    await page.getByText("Autoavaliação das duas tarefas",{exact:true}).waitFor();
    const drafts=page.getByRole("textbox",{name:"Seu texto",exact:true});
    assert.equal(await drafts.count(),2);
    assert.equal(await drafts.nth(0).inputValue(),"First local draft");
    assert.equal(await drafts.nth(1).inputValue(),"Second local draft");
    assert.ok(!calls.includes("exams.writingReview")&&!calls.includes("exams.writingFeedback"));await fit(page);
  },"writing-sequence");
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
  console.log("Academy Chromium: "+passed+"/"+(process.env.LINGUA_QA_EXPERIMENTAL_ROUTES==="1"?33:29));
}finally{await browser.close();}
