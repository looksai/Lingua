import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { EXAM_PILOT_DURATION_MS, EXAM_PRACTICE_DURATION_MS, IELTS_ADAPTER_VERSION, type ExamAttempt, type ExamMode, type ExamResult, type ExamSkill, type IeltsVariant } from "../shared/exam-contract";
import {additionalReading,listeningSets,type ExamSet} from "./exam-content-v2";
type Plan="lingua"|"community";
export function examAccess(email:string|null|undefined,env:NodeJS.ProcessEnv=process.env):Plan|null{
 if(env.LINGUA_EXAM_PILOT_ENABLED!=="true"||!email)return null;
 try{
  const entries:unknown=JSON.parse(env.LINGUA_EXAM_PILOT_ACCOUNTS??"{}");
  if(!entries||typeof entries!=="object"||Array.isArray(entries))return null;
  const key=email.trim().toLowerCase();
  const plan=Object.hasOwn(entries,key)?(entries as Record<string,unknown>)[key]:null;
  return plan==="lingua"||plan==="community"?plan:null;
 }catch{return null;}
}
const tf=["True","False","Not given"] as const;
const sets:Record<IeltsVariant,ExamSet>={
 "ielts-academic":{id:"urban-cooling-01",skill:"reading",title:"Urban cooling and street trees",passage:"In a small field study, researchers placed temperature sensors on twelve streets in a coastal city. Six streets had continuous tree cover; the others had little shade. During the afternoon, shaded pavement was on average four degrees cooler than exposed pavement. The researchers measured surface temperatures rather than air temperatures, so the findings cannot establish how much cooler pedestrians felt. Rainfall was unusually low throughout the observation period. The team recommended repeating the study in wetter months before making city-wide predictions.",questions:[
 {id:"a1",prompt:"The researchers monitored twelve streets.",options:tf,expected:"True",explanation:"The first sentence specifies twelve streets."},
 {id:"a2",prompt:"The researchers directly measured the temperature of the air.",options:tf,expected:"False",explanation:"The passage explicitly says they measured surface temperatures rather than air temperatures."},
 {id:"a3",prompt:"The study was funded by the city council.",options:tf,expected:"Not given",explanation:"The text does not identify a funding source."},
 {id:"a4",prompt:"Why did the team recommend another study?",options:["To compare different seasons","To remove every tree","To test pedestrian speed"],expected:"To compare different seasons",explanation:"They recommended observing wetter months before broader predictions."}]},
 "ielts-general":{id:"community-workshop-01",skill:"reading",title:"Community repair workshop notice",passage:"The Northbank Community Centre offers a free repair workshop on the first Saturday of each month. Visitors must book online before Thursday evening. Each participant may bring one portable household item; bicycles and large appliances are not accepted. Volunteers provide basic tools, but visitors should bring any replacement parts they already own. The workshop opens at 10 am and closes at 1 pm. If an item cannot be repaired safely, volunteers will explain why and suggest possible next steps.",questions:[
 {id:"g1",prompt:"The workshop charges an admission fee.",options:tf,expected:"False",explanation:"The notice describes the workshop as free."},
 {id:"g2",prompt:"Visitors need to reserve a place before Thursday evening.",options:tf,expected:"True",explanation:"The booking deadline is explicitly stated."},
 {id:"g3",prompt:"The centre offers refreshments to visitors.",options:tf,expected:"Not given",explanation:"Refreshments are not mentioned."},
 {id:"g4",prompt:"What should a visitor bring if they already have them?",options:["Replacement parts","All basic tools","A large appliance"],expected:"Replacement parts",explanation:"Volunteers provide tools, but visitors should bring parts they already own."}]}
};
type Stored={owner:number;attempt:ExamAttempt;set:ExamSet;result?:ExamResult};
export function examExercises(variant:IeltsVariant,skill:ExamSkill){return (skill==="reading"?[sets[variant],...additionalReading[variant]]:listeningSets).map(({id,title})=>({id,title}));}
export function resolveExamSet(variant:IeltsVariant,skill:ExamSkill,exerciseId?:string){
 const pool=skill==="reading"?[sets[variant],...additionalReading[variant]]:listeningSets;
 const set=exerciseId?pool.find(x=>x.id===exerciseId):pool[0];
 if(!set)throw new TRPCError({code:"BAD_REQUEST",message:"Atividade incompatível com a seleção."});
 return set;
}
export function publicExamAttempt(id:string,variant:IeltsVariant,mode:ExamMode,set:ExamSet,deadline:number):ExamAttempt{
 return {id,variant,mode,version:IELTS_ADAPTER_VERSION,deadline,exercise:{id:set.id,title:set.title,passage:set.passage,skill:set.skill,questions:set.questions.map(({id,prompt,options})=>({id,prompt,options}))}};
}
export function gradeExamSet(set:ExamSet,mode:ExamMode,version:string,answers:Record<string,string>):ExamResult{
 if(Object.keys(answers).some(key=>!set.questions.some(q=>q.id===key)))throw new TRPCError({code:"BAD_REQUEST",message:"Resposta inválida."});
 for(const q of set.questions)if(Object.hasOwn(answers,q.id)&&!q.options.includes(answers[q.id]!))throw new TRPCError({code:"BAD_REQUEST",message:"Alternativa inválida."});
 const items=set.questions.map(q=>({id:q.id,correct:answers[q.id]===q.expected,expected:q.expected,explanation:q.explanation}));
 return {correct:items.filter(i=>i.correct).length,total:items.length,mode,version,items};
}
export function createExamEngine(clock=Date.now){
 const attempts=new Map<string,Stored>();
 const prune=(now:number)=>{for(const [id,row] of attempts)if(now>row.attempt.deadline+5*60*1000)attempts.delete(id);};
 const missing=()=>new TRPCError({code:"NOT_FOUND",message:"Atividade indisponível. Inicie uma nova."});
 return {
  start(owner:number,variant:IeltsVariant,mode:ExamMode,skill:ExamSkill="reading",exerciseId?:string):ExamAttempt{
   if(skill==="listening"&&mode==="timed")throw new TRPCError({code:"BAD_REQUEST",message:"Listening cronometrado ainda não disponível."});
   const set=resolveExamSet(variant,skill,exerciseId);
   const now=clock();prune(now);
   if(attempts.size>=2000)throw new TRPCError({code:"TOO_MANY_REQUESTS",message:"Limite temporário de atividades atingido."});
   // One live attempt per account. Starting a new one replaces the old session.
   for(const [id,row] of attempts)if(row.owner===owner)attempts.delete(id);
   const attempt=publicExamAttempt(randomUUID(),variant,mode,set,now+(mode==="timed"?EXAM_PILOT_DURATION_MS:EXAM_PRACTICE_DURATION_MS));
   attempts.set(attempt.id,{owner,attempt,set});return attempt;
  },
  submit(owner:number,id:string,answers:Record<string,string>):ExamResult{
   const now=clock();prune(now);const row=attempts.get(id);
   if(!row||row.owner!==owner)throw missing();
   if(row.result)return row.result;
   if(now>=row.attempt.deadline)throw new TRPCError({code:"PRECONDITION_FAILED",message:"O tempo terminou. Inicie outra atividade."});
   const result=gradeExamSet(row.set,row.attempt.mode,row.attempt.version,answers);row.result=result;return result;
  },
 };
}
export const examEngine=createExamEngine();
