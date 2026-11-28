import {useState} from "react";
import {advanceIntegrated,integratedStage,INTEGRATED_STAGES,type IntegratedSession,type IntegratedStage} from "../../../shared/exam-integrated-contract";
import type {IeltsVariant} from "../../../shared/exam-contract";
const labels={listening:"Listening",reading:"Reading",writing:"Writing",speaking:"Speaking"};
export default function ExamIntegratedPractice({variant,onOpen}:{variant:IeltsVariant;onOpen:(stage:IntegratedStage)=>void}){
 const [session,setSession]=useState<IntegratedSession>({variant,outcomes:[]});
 const stage=integratedStage(session);
 return <section aria-label="Roteiro integrado de prática" className="space-y-4 rounded-xl border p-5">
 <h2 className="text-xl font-semibold">Prática integrada IELTS</h2>
 <p>Roteiro guiado das quatro habilidades. Não é um exame oficial e não produz nota de proficiência.</p>
 <ol className="space-y-2">{INTEGRATED_STAGES.map(s=><li key={s}>{labels[s]} — {session.outcomes.some(o=>o.stage===s)?"Etapa marcada pelo estudante":stage===s?"Próxima etapa":"Pendente"}</li>)}</ol>
 {stage?<div className="flex flex-wrap gap-3"><button className="academy-primary" onClick={()=>onOpen(stage)}>Abrir {labels[stage]}</button><button onClick={()=>setSession(prev=>advanceIntegrated(prev,{stage,status:"skipped"}))}>Avançar no roteiro</button></div>:<p role="status">Roteiro encerrado. A conclusão das atividades é verificada separadamente.</p>}
 <button onClick={()=>setSession({variant,outcomes:[]})}>Reiniciar roteiro</button>
 </section>;
}
