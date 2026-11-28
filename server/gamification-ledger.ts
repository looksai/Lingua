import {XP_RULES,GAMIFICATION_POLICY_VERSION,type XpEvent,type XpAward} from "../shared/gamification-contract";
export type LedgerEntry=XpAward;
export interface OwnerLedger {
 find(kind:XpEvent["kind"],sourceId:string):Promise<LedgerEntry|undefined>;
 countAwarded(kind:XpEvent["kind"],fromMs:number,toMs:number):Promise<number>;
 insert(entry:LedgerEntry):Promise<void>;
}
export interface GamificationLedger {
 // Implementations must serialize transactions per owner, including empty ledgers.
 transaction<T>(userId:number,work:(ledger:OwnerLedger)=>Promise<T>):Promise<T>;
}
// Only trusted server completion handlers may call this service.
export async function recordParticipation(store:GamificationLedger,userId:number,event:XpEvent):Promise<LedgerEntry>{
 if(!Number.isSafeInteger(userId)||userId<=0||!Object.prototype.hasOwnProperty.call(XP_RULES,event.kind)||!event.sourceId.trim()||event.sourceId.length>180||!Number.isSafeInteger(event.occurredAtMs)||event.occurredAtMs<0||event.occurredAtMs>8640000000000000)throw new Error("Invalid participation evidence");
 return store.transaction(userId,async ledger=>{
  const existing=await ledger.find(event.kind,event.sourceId);
  if(existing){
   if(existing.occurredAtMs!==event.occurredAtMs)throw new Error("Conflicting participation evidence");
   return existing;
  }
  const day=Math.floor(event.occurredAtMs/86400000)*86400000;
  const rule=XP_RULES[event.kind];
  const count=await ledger.countAwarded(event.kind,day,day+86400000);
  const entry:LedgerEntry={...event,xp:count>=rule.dailyLimit?0:rule.xp,policyVersion:GAMIFICATION_POLICY_VERSION};
  await ledger.insert(entry);
  return entry;
 });
}
