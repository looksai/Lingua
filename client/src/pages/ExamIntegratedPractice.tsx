import {advanceIntegrated,integratedReport,integratedStage,INTEGRATED_STAGES,type IntegratedSession,type IntegratedStage} from "../../../shared/exam-integrated-contract";
const labels={listening:"Listening",reading:"Reading",writing:"Writing",speaking:"Speaking"};
export default function ExamIntegratedPractice({session,onChange,onOpen}:{session:IntegratedSession;onChange:(next:IntegratedSession)=>void;onOpen:(stage:IntegratedStage)=>void}){
 const stage=integratedStage(session);
 const report=integratedReport(session);
 return <section aria-label="Roteiro integrado de prática" className="space-y-4 rounded-xl border p-5">
 <h2 className="text-xl font-semibold">Prática integrada IELTS</h2>
 <p>Roteiro guiado das quatro habilidades. Não é um exame oficial e não produz nota de proficiência.</p>
 <ol className="space-y-2">{INTEGRATED_STAGES.map(s=><li key={s}>{labels[s]} — {session.outcomes.some(o=>o.stage===s)?(session.outcomes.find(o=>o.stage===s)?.status==="completed"?"Concluída":session.outcomes.find(o=>o.stage===s)?.status==="expired"?"Tempo encerrado":"Pulada"):stage===s?"Próxima etapa":"Pendente"}</li>)}</ol>
 {stage?<div className="flex flex-wrap gap-3"><button className="academy-primary" onClick={()=>onOpen(stage)}>Abrir {labels[stage]}</button><button onClick={()=>onChange(advanceIntegrated(session,{stage,status:"skipped"}))}>Pular etapa</button></div>:<div role="status"><h3>Relatório da prática integrada</h3><p>{report.completed} de 4 etapas concluídas.</p>{report.stages.map(item=><p key={item.stage}>{labels[item.stage]}: {item.objective?`${item.objective.correct}/${item.objective.total} acertos`:item.status==="completed"?"Prática concluída, sem nota":item.status==="expired"?"Tempo encerrado":"Pulada"}</p>)}<p>Resultados locais desta sessão. Não representam banda IELTS nem certificação.</p></div>}
 <button onClick={()=>onChange({variant:session.variant,outcomes:[]})}>Reiniciar roteiro</button>
 </section>;
}
