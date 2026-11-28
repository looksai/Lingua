import type {XpAward,XpKind} from "./gamification-contract";
export const ACHIEVEMENTS=[
 {id:"first-lesson",title:"Primeiro passo",kind:"lesson_completed",threshold:1},
 {id:"hundred-lessons",title:"Conhecimento",kind:"lesson_completed",threshold:100},
 {id:"fifty-reviews",title:"Memória em prática",kind:"review_completed",threshold:50},
 {id:"fifty-oral",title:"Sem fronteiras",kind:"oral_practice_completed",threshold:50},
 {id:"ten-integrated",title:"Determinação",kind:"integrated_practice_completed",threshold:10},
] as const satisfies readonly {id:string;title:string;kind:XpKind;threshold:number}[];
export function achievementProgress(awards:readonly XpAward[]){
 const counts=new Map<XpKind,number>(),seen=new Set<string>();
 for(const award of awards){
  const key=JSON.stringify([award.kind,award.sourceId]);
  if(seen.has(key))continue;
  seen.add(key);
  counts.set(award.kind,(counts.get(award.kind)??0)+1);
 }
 return ACHIEVEMENTS.map(a=>{
  const count=counts.get(a.kind)??0;
  return {...a,progress:Math.min(count,a.threshold),unlocked:count>=a.threshold};
 });
}
