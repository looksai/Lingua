// Per-process laboratory limiter. Distributed deployment requires shared enforcement.
export function createPartnerInviteLimiter({windowMs=60000,limit=30,maxKeys=10000,clock=Date.now}={}){
 if(![windowMs,limit,maxKeys].every(n=>Number.isSafeInteger(n)&&n>0))throw new Error("Invalid limiter configuration");
 const entries=new Map<string,{until:number;count:number}>();
 return (key:string)=>{
  const now=clock();
  if(!Number.isFinite(now)||!key||key.length>256)return false;
  let entry=entries.get(key);
  if(entry&&entry.until<=now){entries.delete(key);entry=undefined;}
  if(!entry){
   if(entries.size>=maxKeys){
    for(const [k,v] of entries)if(v.until<=now)entries.delete(k);
    if(entries.size>=maxKeys)return false;
   }
   entry={until:now+windowMs,count:0};entries.set(key,entry);
  }
  if(entry.count>=limit)return false;
  entry.count++;return true;
 };
}
