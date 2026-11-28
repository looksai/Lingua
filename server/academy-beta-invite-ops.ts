import {createHash,randomBytes} from "node:crypto";
import {z} from "zod";

// Pure operator policy: no disk writes, emails or raw invitation tokens in this module's logs.
const entrySchema=z.object({
 email:z.email().max(320),
 tokenHash:z.string().regex(/^[0-9a-f]{64}$/),
 expiresAt:z.iso.datetime(),
}).strict();
const listSchema=z.array(entrySchema).max(20);
export type BetaInvitation=z.infer<typeof entrySchema>;
const MAX_INVITES=20;
const MAX_DAYS=30;
const DAY_MS=86_400_000;
export function betaEmail(email:string){return email.trim().toLowerCase();}

export function readBetaInvitations(json:string):BetaInvitation[]{
 const entries=listSchema.parse(JSON.parse(json));
 const emails=entries.map(row=>betaEmail(row.email));
 const hashes=entries.map(row=>row.tokenHash);
 if(new Set(emails).size!==emails.length||new Set(hashes).size!==hashes.length)throw Error("Duplicate invitations");
 return entries;
}
export function inspectBetaInvitations(json:string,now=Date.now()){
 if(!Number.isSafeInteger(now)||now<0)throw Error("Invalid time");
 const entries=readBetaInvitations(json);
 const active=entries.filter(row=>Date.parse(row.expiresAt)>now).length;
 return {total:entries.length,active,expired:entries.length-active,availableSlots:MAX_INVITES-entries.length};
}
export function issueBetaInvitation(
 json:string,email:string,days:number,now=Date.now(),
 generate:()=>string=()=>randomBytes(32).toString("base64url"),
){
 const existing=readBetaInvitations(json);
 const normalized=betaEmail(email);
 if(!entrySchema.shape.email.safeParse(normalized).success)throw Error("Invalid email");
 if(!Number.isSafeInteger(days)||days<1||days>MAX_DAYS)throw Error("Invitation lifetime must be 1 to 30 days");
 if(!Number.isSafeInteger(now)||now<0)throw Error("Invalid time");
 const expiresAtMs=now+days*DAY_MS;
 if(!Number.isSafeInteger(expiresAtMs))throw Error("Invalid expiration");
 if(existing.length>=MAX_INVITES)throw Error("Pilot is limited to 20 invitations");
 if(existing.some(row=>betaEmail(row.email)===normalized))throw Error("Email already invited; revoke first");
 const code=generate();
 if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error("Invalid generated invitation");
 const tokenHash=createHash("sha256").update(code).digest("hex");
 if(existing.some(row=>row.tokenHash===tokenHash))throw Error("Duplicate invitation token");
 const row:BetaInvitation={email:normalized,tokenHash,expiresAt:new Date(expiresAtMs).toISOString()};
 const records=[...existing,row];
 return {records,json:JSON.stringify(records,null,2)+"\n",code,expiresAt:row.expiresAt};
}
export function revokeBetaInvitation(json:string,email:string){
 const normalized=betaEmail(email);
 const records=readBetaInvitations(json);
 const updated=records.filter(row=>betaEmail(row.email)!==normalized);
 if(updated.length===records.length)throw Error("Unknown invited email");
 return {records:updated,json:JSON.stringify(updated,null,2)+"\n"};
}
