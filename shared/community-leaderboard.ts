export type RankingCandidate={memberId:number;active:boolean;optedIn:boolean;weeklyXp:number};
// Server must supply owner-scoped, verified weekly totals and current membership.
export function weeklyParticipationRanking(candidates:readonly RankingCandidate[],limit=20){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid ranking limit");
 const seen=new Set<number>();
 const eligible=candidates.filter(c=>{
  if(!Number.isSafeInteger(c.memberId)||c.memberId<=0||seen.has(c.memberId))throw Error("Invalid or duplicate ranking member");
  seen.add(c.memberId);
  return c.active===true&&c.optedIn===true&&Number.isSafeInteger(c.weeklyXp)&&c.weeklyXp>0&&c.weeklyXp<=5250;
 }).sort((a,b)=>b.weeklyXp-a.weeklyXp||a.memberId-b.memberId);
 let rank=0,previous=-1;
 return eligible.slice(0,limit).map((c,i)=>{
  if(c.weeklyXp!==previous)rank=i+1;
  previous=c.weeklyXp;
  return {memberId:c.memberId,weeklyXp:c.weeklyXp,rank};
 });
}
