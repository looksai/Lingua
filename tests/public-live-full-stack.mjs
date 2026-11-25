import {chromium} from "playwright";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const token=process.env.LAB_INVITE_TOKEN;
assert.match(token??"",/^[A-Za-z0-9_-]{43}$/);
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const origin="http://127.0.0.1:4173";
 await page.goto(origin+"/live#"+token);
 await page.getByRole("heading",{name:"Evento integrado"}).waitFor();
 await page.getByText("A transmissão ainda não começou.").waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 execFileSync("pnpm",["exec","tsx","tests/public-live-full-stack-transition.ts","live"],{stdio:"inherit"});
 await page.reload();
 await page.getByText("Evento ao vivo. A transmissão de vídeo ainda não está disponível nesta versão.").waitFor();
 execFileSync("pnpm",["exec","tsx","tests/public-live-full-stack-transition.ts","revoke"],{stdio:"inherit"});
 await page.reload();
 await page.getByRole("heading",{name:"Convite indisponível"}).waitFor();
 assert.equal(await page.getByRole("heading",{name:"Evento integrado"}).count(),0);
 console.log("Full-stack public invite lifecycle passed");
}finally{await browser.close();}
