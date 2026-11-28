import {recordParticipation,type GamificationLedger,type LedgerEntry} from "./gamification-ledger";
import type {OwnedReviewEvidence} from "./gamification-review-evidence";
// Laboratory only. Records must be selected by authenticated owner, never supplied by a client.
// Import oldest first; retries are idempotent. Partial failures can be retried.
export async function importOwnedReviewEvidence(store:GamificationLedger,userId:number,records:readonly OwnedReviewEvidence[],nowMs=Date.now()):Promise<LedgerEntry[]>{
 if(!Number.isSafeInteger(userId)||userId<=0||!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid import context");
 const ordered=records.map(r=>({id:r.logId,time:r.createdAt.getTime()}));
 if(ordered.some(r=>!Number.isSafeInteger(r.id)||r.id<=0||!Number.isSafeInteger(r.time)||r.time<0||r.time>nowMs))throw Error("Invalid review evidence");
 ordered.sort((a,b)=>a.time-b.time||a.id-b.id);
 const seen=new Map<number,number>();
 for(const r of ordered){if(seen.has(r.id)&&seen.get(r.id)!==r.time)throw Error("Conflicting review evidence");seen.set(r.id,r.time);}
 const receipts:LedgerEntry[]=[];
 for(const [id,time] of seen)receipts.push(await recordParticipation(store,userId,{kind:"review_completed",sourceId:String(id),occurredAtMs:time}));
 return receipts;
}
