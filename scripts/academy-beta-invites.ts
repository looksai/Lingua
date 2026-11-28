/**
 * Offline Academy Beta invitation operator; never connects to production.
 * Usage:
 *   pnpm exec tsx scripts/academy-beta-invites.ts issue /secure/outside-repo/invites.json learner@example.com 7
 *   pnpm exec tsx scripts/academy-beta-invites.ts revoke /secure/outside-repo/invites.json learner@example.com
 *   pnpm exec tsx scripts/academy-beta-invites.ts audit /secure/outside-repo/invites.json
 * The clear-text token appears exactly once on stdout for secure delivery.
 * Only its SHA-256 hash is written to disk, with mode 0600.
 */
import {lstat,readFile,realpath,rename,unlink,writeFile} from "node:fs/promises";
import {dirname,isAbsolute,relative,resolve,sep} from "node:path";
import {randomBytes} from "node:crypto";
import {fileURLToPath} from "node:url";
import {inspectBetaInvitations,issueBetaInvitation,revokeBetaInvitation} from "../server/academy-beta-invite-ops";

function outsideRepo(target:string,root:string){
 const rel=relative(root,target);
 return rel===".."||rel.startsWith(".."+sep) ? true : isAbsolute(rel);
}
async function resolveProtectedTarget(input:string){
 if(!isAbsolute(input))throw Error("Use an absolute pathname outside the checkout");
 const target=resolve(input);
 const repository=await realpath(process.cwd());
 const parent=await realpath(dirname(target));
 if(!outsideRepo(target,repository)||!outsideRepo(parent,repository))throw Error("Refusing to store invitations inside the repository");
 try{
  const stat=await lstat(target);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error("Invitation store must be a regular file, not a symlink");
  if((stat.mode&0o077)!==0)throw Error("Invitation store permissions must be 0600");
 }catch(error){
  if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
 }
 return target;
}
async function load(target:string,allowMissing:boolean){
 try{return await readFile(target,"utf8");}
 catch(error){
  if(allowMissing&&(error as NodeJS.ErrnoException).code==="ENOENT")return "[]";
  throw error;
 }
}
async function store(target:string,content:string){
 const temporary=target+"."+randomBytes(8).toString("hex")+".tmp";
 try{
  await writeFile(temporary,content,{mode:0o600,flag:"wx"});
  await rename(temporary,target);
 }finally{await unlink(temporary).catch(()=>{});}
}
export async function main(args:string[]){
 const [command,file,email,ttl]=args;
 if(!file||!["issue","revoke","audit"].includes(command??""))throw Error("Usage: issue FILE EMAIL DAYS | revoke FILE EMAIL | audit FILE");
 const target=await resolveProtectedTarget(file);
 const json=await load(target,command==="issue");
 if(command==="audit"){
  if(email!==undefined||ttl!==undefined)throw Error("audit accepts only FILE");
  const summary=inspectBetaInvitations(json);
  process.stdout.write(JSON.stringify(summary)+"\n");return;
 }
 if(!email)throw Error("Email is required");
 if(command==="revoke"){
  if(ttl!==undefined)throw Error("revoke accepts FILE and EMAIL");
  await store(target,revokeBetaInvitation(json,email).json);
  process.stdout.write("Invitation revoked. Update the pilot environment with the new hashed JSON store.\n");return;
 }
 if(!ttl||!/^[0-9]+$/.test(ttl))throw Error("Provide lifetime in whole days (1–30)");
 const issued=issueBetaInvitation(json,email,Number(ttl));
 await store(target,issued.json);
 process.stdout.write("INVITE_CODE="+issued.code+"\n");
 process.stderr.write("Expires "+issued.expiresAt+". Share securely, never commit or log the code. Restart the pilot with the new ACADEMY_INVITATIONS_JSON.\n");
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 main(process.argv.slice(2)).catch(error=>{
  process.stderr.write("Invitation operator: "+(error instanceof Error?error.message:"Unknown error")+"\n");
  process.exitCode=1;
 });
}
