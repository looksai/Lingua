/**
 * Offline Academy Beta invitation operator; never connects to production.
 * Usage:
 *   pnpm exec tsx scripts/academy-beta-invites.ts issue /secure/outside-repo/invites.json learner@example.com 7
 *   pnpm exec tsx scripts/academy-beta-invites.ts revoke /secure/outside-repo/invites.json learner@example.com
 *   pnpm exec tsx scripts/academy-beta-invites.ts audit /secure/outside-repo/invites.json
 *   pnpm exec tsx scripts/academy-beta-invites.ts prune /secure/outside-repo/invites.json
 * The clear-text token appears exactly once on stdout for secure delivery.
 * Only its SHA-256 hash is written to disk, with mode 0600.
 */
import {lstat,open,readFile,realpath,rename,stat,unlink,writeFile} from "node:fs/promises";
import {dirname,isAbsolute,relative,resolve,sep} from "node:path";
import {randomBytes} from "node:crypto";
import {fileURLToPath} from "node:url";
import {inspectBetaInvitations,issueBetaInvitation,pruneExpiredBetaInvitations,revokeBetaInvitation} from "../server/academy-beta-invite-ops";

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
 const parentStat=await stat(parent);
 // Prevent other local users from reading or swapping the file while it is updated.
 if(!parentStat.isDirectory()||(parentStat.mode&0o077)!==0)
  throw Error("Invitation store directory must be private (0700)");

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
/** Fail-closed single-writer lock: overlapping issue/revoke calls cannot overwrite
 * each other's invitation JSON. A stale lock is never silently stolen. */
async function withInvitationLock<T>(target:string,operation:()=>Promise<T>):Promise<T>{
 const lockPath=target+".lock";
 let handle;
 try{
  handle=await open(lockPath,"wx",0o600);
 }catch(error){
  if((error as NodeJS.ErrnoException).code==="EEXIST")
   throw Error("Invitation store is locked; resolve the other operation before retrying");
  throw error;
 }
 try{return await operation();}
 finally{
  await handle.close();
  await unlink(lockPath);
 }
}
export async function main(args:string[]){
 const [command,file,email,ttl]=args;
 if(!file||!["issue","revoke","audit","prune"].includes(command??""))throw Error("Usage: issue FILE EMAIL DAYS | revoke FILE EMAIL | audit FILE | prune FILE");
 const target=await resolveProtectedTarget(file);
 if(command==="audit"){
  if(email!==undefined||ttl!==undefined)throw Error("audit accepts only FILE");
  const summary=inspectBetaInvitations(await load(target,false));
  process.stdout.write(JSON.stringify(summary)+"\n");return;
 }
 if(command==="prune"&&(email!==undefined||ttl!==undefined))throw Error("prune accepts only FILE");
 if(command!=="prune"&&!email)throw Error("Email is required");
 if(command==="revoke"&&ttl!==undefined)throw Error("revoke accepts FILE and EMAIL");
 if(command==="issue"&&(!ttl||!/^[0-9]+$/.test(ttl)))throw Error("Provide lifetime in whole days (1–30)");
 await withInvitationLock(target,async()=>{
  // Read only after taking the exclusive lock so the next operator cannot
  // overwrite an invitation issued by the previous one.
  const json=await load(target,command==="issue");
  if(command==="prune"){
   const result=pruneExpiredBetaInvitations(json);
   if(result.removed>0)await store(target,result.json);
   process.stdout.write(JSON.stringify({removed:result.removed,remaining:result.remaining})+"\n");
   return;
  }
  if(command==="revoke"){
   await store(target,revokeBetaInvitation(json,email).json);
   process.stdout.write("Invitation revoked. Update the pilot environment with the new hashed JSON store.\n");
   return;
  }
  const issued=issueBetaInvitation(json,email,Number(ttl));
  await store(target,issued.json);
  process.stdout.write("INVITE_CODE="+issued.code+"\n");
  process.stderr.write("Expires "+issued.expiresAt+". Share securely, never commit or log the code. Restart the pilot with the new ACADEMY_INVITATIONS_JSON.\n");
 });
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
 main(process.argv.slice(2)).catch(error=>{
  process.stderr.write("Invitation operator: "+(error instanceof Error?error.message:"Unknown error")+"\n");
  process.exitCode=1;
 });
}
