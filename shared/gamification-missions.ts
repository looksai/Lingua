import type {XpAward,XpKind} from "./gamification-contract";
const DAY=86400000;
const MISSIONS=[
 {id:"daily-review",title:"Revisão consistente",kind:"review_completed",target:5,period:"daily"},
 {id:"daily-lesson",title:"Aprender algo novo",kind:"lesson_completed",target:1,period:"daily"},
 {id:"weekly-oral",title:"Conversação em prática",kind:"oral_practice_completed",target:3,period:"weekly"},
 {id:"weekly-review",title:"Memória ativa",kind:"review_completed",target:25,period:"weekly"},
] as const satisfies readonly {id:string;title:string;kind:XpKind;target:number;period:"daily"|"weekly"}[];
// UTC windows, Monday-start weeks. No bonus XP or social publication.
export function participationMissions(awards:readonly XpAward[],nowMs:number){
 if(!Number.isSafeInteger(nowMs)||nowMs<0||nowMs>8640000000000000)throw Error("Invalid mission clock");
 const day=Math.floor(nowMs/DAY),week=day-((day+3)%7);
 return MISSIONS.map(m=>{
  const startMs=(m.period==="daily"?day:week)*DAY;
  const endMs=startMs+(m.period==="daily"?1:7)*DAY;
  const ids=new Set(awards.filter(a=>a.kind===m.kind&&a.xp>0&&a.occurredAtMs>=startMs&&a.occurredAtMs<endMs&&a.occurredAtMs<=nowMs).map(a=>a.sourceId));
  return {...m,startMs,endMs,progress:Math.min(ids.size,m.target),completed:ids.size>=m.target};
 });
}
