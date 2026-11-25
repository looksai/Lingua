import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const a="a".repeat(43),b="b".repeat(43);
 await page.route("**/api/trpc/partnerInvites.resolve",async route=>{
  const token=route.request().postDataJSON().json.token;
  await route.fulfill({json:{result:{data:{json:token===a?{title:"Primeiro evento",partnerName:"Empresa A",scheduledAt:"2026-11-25T12:00:00Z",canWatch:false}:null}}}});
 });
 await page.goto("http://127.0.0.1:4173/live#"+a);
 await page.getByRole("heading",{name:"Primeiro evento"}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(token=>location.hash=token,b);
 await page.getByRole("heading",{name:"Convite indisponível"}).waitFor();
 assert.equal(await page.getByRole("heading",{name:"Primeiro evento"}).count(),0);
 await page.getByRole("link",{name:"Conhecer o Lingua"}).waitFor();
 console.log("Public live mobile navigation passed");
}finally{await browser.close();}
