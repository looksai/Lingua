import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch();
let status="draft",created=false,issued=false,revoked=false;
const token="a".repeat(43),digest="b".repeat(64);
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route("**/api/trpc/**",async route=>{
  const req=route.request(),url=new URL(req.url());
  const names=decodeURIComponent(url.pathname.split("/").pop()).split(",");
  const input=req.method()==="POST"?req.postDataJSON():JSON.parse(url.searchParams.get("input")??"{}");
  const result=names.map((name,i)=>{
   const arg=input?.[i]?.json??{};
   let json;
   switch(name){
    case "auth.me":json={id:1,email:"lab@example.test"};break;
    case "partnerEvents.mine":json=[{id:7,name:"Empresa laboratório",role:"owner"}];break;
    case "partnerEvents.list":assert.equal(arg.partnerId,7);json=created?[{id:9,title:"Evento teste",status,visibility:"public",scheduledAt:"2026-12-01T12:00:00Z"}]:[];break;
    case "partnerEvents.create":assert.equal(arg.partnerId,7);assert.equal(arg.title,"Evento teste");created=true;json={id:9};break;
    case "partnerEvents.transition":assert.equal(arg.eventId,9);status=arg.to;json={updated:true};break;
    case "partnerInvites.list":json=issued?[{digest,createdAt:"2026-11-25T12:00:00Z",expiresAt:null,revokedAt:revoked?"2026-11-25T12:01:00Z":null}]:[];break;
    case "partnerInvites.issue":issued=true;json={token};break;
    case "partnerInvites.revoke":assert.equal(arg.digest,digest);revoked=true;json={revoked:true};break;
    default:throw Error("Unexpected procedure "+name);
   }
   return {result:{data:{json}}};
  });
  await route.fulfill({json:result});
 });
 await page.goto("http://127.0.0.1:4173/partners");
 await page.getByLabel("Título").fill("Evento teste");
 await page.getByLabel("Data e hora local").fill("2026-12-01T12:00");
 await page.getByLabel("Visibilidade").selectOption("public");
 await page.getByRole("button",{name:"Criar rascunho"}).click();
 await page.getByRole("heading",{name:"Evento teste"}).waitFor();
 await page.getByRole("button",{name:"Publicado",exact:true}).click();
 await page.getByRole("button",{name:"Gerar convite público"}).click();
 await page.getByLabel("Link público").waitFor();
 assert.equal(await page.getByLabel("Link público").inputValue(),"http://127.0.0.1:4173/live#"+token);
 await page.reload();
 await page.getByRole("button",{name:"Revogar convite anterior"}).click();
 await page.getByText("Revogado",{exact:false}).first().waitFor();
 assert.ok(revoked);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log("Partner dashboard mobile fixture lifecycle passed");
}finally{await browser.close();}
