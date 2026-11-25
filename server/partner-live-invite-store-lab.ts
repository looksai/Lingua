import type {StoredLiveInvite} from "./partner-live-invite-service";
// Laboratory only: no production wiring, no durability or multi-instance guarantees.
export class LiveInviteStoreLab {
 private readonly records=new Map<string,StoredLiveInvite>();
 constructor(private readonly capacity=1000){
  if(!Number.isSafeInteger(capacity)||capacity<1)throw new Error("Invalid capacity");
 }
 insert(record:StoredLiveInvite):boolean{
  if(!/^[a-f0-9]{64}$/.test(record.digest)||this.records.has(record.digest)||this.records.size>=this.capacity)return false;
  this.records.set(record.digest,{...record});
  return true;
 }
 find(digest:string):StoredLiveInvite|null{
  const record=this.records.get(digest);
  return record?{...record}:null;
 }
 // Conditional revocation prevents changing ownership or overwriting an earlier revocation.
 revoke(digest:string,partnerId:string,eventId:string,now:number):boolean{
  const record=this.records.get(digest);
  if(!record||record.partnerId!==partnerId||record.eventId!==eventId||!Number.isFinite(now))return false;
  if(record.revokedAt===null)this.records.set(digest,{...record,revokedAt:now});
  return true;
 }
}
