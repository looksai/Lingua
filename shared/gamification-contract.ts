export const GAMIFICATION_POLICY_VERSION="participation-v1";
export const XP_RULES={
 lesson_completed:{xp:20,dailyLimit:10},
 review_completed:{xp:10,dailyLimit:20},
 oral_practice_completed:{xp:30,dailyLimit:5},
 integrated_practice_completed:{xp:100,dailyLimit:2},
} as const;
export type XpKind=keyof typeof XP_RULES;
export type XpEvent={kind:XpKind;sourceId:string;occurredAtMs:number};
export type XpAward=XpEvent&{xp:number;policyVersion:typeof GAMIFICATION_POLICY_VERSION};
// Pure per-member projection. Inputs must originate from authorized server-side completion evidence.
export function projectXp(events:readonly XpEvent[]):XpAward[]{
 const seen=new Set<string>(),counts=new Map<string,number>(),awards:XpAward[]=[];
 const ordered=[...events].sort((a,b)=>a.occurredAtMs-b.occurredAtMs||(a.kind<b.kind?-1:a.kind>b.kind?1:a.sourceId<b.sourceId?-1:a.sourceId>b.sourceId?1:0));
 for(const event of ordered){
  if(!Object.prototype.hasOwnProperty.call(XP_RULES,event.kind)||!event.sourceId.trim()||!Number.isSafeInteger(event.occurredAtMs)||event.occurredAtMs<0||event.occurredAtMs>8640000000000000)continue;
  const key=JSON.stringify([event.kind,event.sourceId]);
  if(seen.has(key))continue;
  seen.add(key);
  const day=new Date(event.occurredAtMs).toISOString().slice(0,10);
  const bucket=event.kind+":"+day,rule=XP_RULES[event.kind],count=counts.get(bucket)??0;
  if(count>=rule.dailyLimit)continue;
  counts.set(bucket,count+1);
  awards.push({...event,xp:rule.xp,policyVersion:GAMIFICATION_POLICY_VERSION});
 }
 return awards;
}
export function xpProgress(awards:readonly XpAward[]){
 const totalXp=awards.reduce((sum,a)=>sum+a.xp,0);
 const level=Math.floor(totalXp/250)+1;
 return {totalXp,level,xpIntoLevel:totalXp%250,xpPerLevel:250};
}
