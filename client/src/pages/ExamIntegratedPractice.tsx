import {advanceIntegrated,integratedStage,INTEGRATED_STAGES,type IntegratedSession,type IntegratedStage} from "../../../shared/exam-integrated-contract";
const labels={listening:"Listening",reading:"Reading",writing:"Writing",speaking:"Speaking"};
export default function ExamIntegratedPractice({session,onChange,onOpen}:{session:IntegratedSession;onChange:(next:IntegratedSession)=>void;onOpen:(stage:IntegratedStage)=>void}){
 const stage=integratedStage(session);
 return <section aria-label="Roteiro integrado de prática" className="space-y-4 rounded-xl border p-5">
 <h2 className="text-xl font-semibold">Prática integrada IELTS</h2>
 <p>Roteiro guiado das quatro habilidades. Não é um exame oficial e não produz nota de proficiência.</p>
 <ol className="space-y-2">{INTEGRATED_STAGES.map(s=><li key={s}>{labels[s]} — {session.outcomes.some(o=>o.stage===s)?(session.outcomes.find(o=>o.stage===s)?.status==="completed"?"Concluída":session.outcomes.find(o=>o.stage===s)?.status==="expired"?"Tempo encerrado":"Pulada"):stage===s?"Próxima etapa":"Pendente"}</li>)}</ol>
 {stage?<div className="flex flex-wrap gap-3"><button className="academy-primary" onClick={()=>onOpen(stage)}>Abrir {labels[stage]}</button><button onClick={()=>onChange(advanceIntegrated(session,{stage,status:"skipped"}))}>Pular etapa</button></div>:<p role="status">Roteiro encerrado. A conclusão das atividades é verificada separadamente.</p>}
 <button onClick={()=>onChange({variant:session.variant,outcomes:[]})}>Reiniciar roteiro</button>
 </section>;
}
