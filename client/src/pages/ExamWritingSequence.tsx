import {useEffect,useState} from "react";
import type {WritingTask} from "@shared/exam-writing-contract";
import {countWritingWords} from "@shared/exam-writing-contract";
import {writingSequence,reviewWritingSequence,WRITING_SEQUENCE_MS} from "@shared/exam-writing-sequence";
export default function ExamWritingSequence({tasks,allowed}:{tasks:readonly WritingTask[];allowed:boolean}){
 const sequence=writingSequence(tasks);
 const [deadline,setDeadline]=useState<number|null>(null);
 const [now,setNow]=useState(Date.now);
 const [index,setIndex]=useState(0);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [finished,setFinished]=useState(false);
 useEffect(()=>{
  if(!allowed||deadline===null||finished)return;
  const tick=()=>{const time=Date.now();setNow(time);if(time>=deadline)setFinished(true);};
  tick();const timer=window.setInterval(tick,500);return()=>window.clearInterval(timer);
 },[deadline,finished,allowed]);
 useEffect(()=>{if(!allowed){setDeadline(null);setDrafts({});setFinished(false);setIndex(0);}},[allowed]);
 const task=sequence[index],remaining=deadline===null?0:Math.max(0,Math.ceil((deadline-now)/1000));
 function reset(){setDeadline(null);setDrafts({});setFinished(false);setIndex(0);}
 function finish(){if(window.confirm("Encerrar a sequência e abrir a autoavaliação? Os textos não poderão ser editados nesta tentativa."))setFinished(true);}
 if(!allowed||sequence.length!==2||!task)return <p>Sequência indisponível.</p>;
 return <div className="exam-writing-review">
  <h3>Sequência de Writing · 60 minutos</h3>
  <p>Duas tarefas originais em uma sessão. Cronômetro local de prática; não é uma prova supervisionada nem atribui nota. Seus textos ficam somente nesta página, sem envio ao servidor ou à IA. Sair descarta os rascunhos.</p>
  {deadline===null?<button className="academy-primary" onClick={()=>{const time=Date.now();setNow(time);setDeadline(time+WRITING_SEQUENCE_MS);}}>Iniciar sequência de Writing</button>:<>
   {!finished?<><p role="status">Tempo restante: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}</p>
    <nav aria-label="Tarefas da sequência Writing">{sequence.map((t,i)=><button type="button" className="academy-secondary" key={t.id} aria-pressed={index===i} onClick={()=>setIndex(i)}>Task {t.kind}</button>)}</nav>
    <p>Task {task.kind} · {task.minimumWords} palavras · referência de {task.recommendedMinutes} minutos</p>
    <article className="exam-passage" lang="en"><h4>{task.title}</h4><p>{task.prompt}</p>{task.table&&<div style={{overflowX:"auto"}}><table><caption>{task.table.caption}</caption><thead><tr>{task.table.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{task.table.rows.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>}</article>
    <label>Seu texto em inglês<textarea lang="en" rows={12} maxLength={20000} value={drafts[task.id]??""} disabled={remaining===0} onChange={e=>{if(Date.now()<deadline)setDrafts(old=>({...old,[task.id]:e.target.value}));}}/></label>
    <p>{countWritingWords(drafts[task.id]??"")} / {task.minimumWords} palavras</p>
    <button className="academy-primary" onClick={finish}>Encerrar sequência e revisar</button>
   </>:<><h3>Autoavaliação das duas tarefas</h3><p>Nenhuma nota atribuída. Contagem de palavras não mede qualidade linguística.</p>{reviewWritingSequence(tasks,drafts).map(r=><article key={r.taskId}><h4>Task {r.kind} · {r.title}</h4><p>{r.words} palavras · {r.minimumMet?"Mínimo atingido":"Abaixo do mínimo"}</p><label>Seu texto<textarea lang="en" readOnly rows={6} value={drafts[r.taskId]??""}/></label>{r.questions.map(q=><p key={q} lang="en">{q}</p>)}</article>)}<h4>Critérios de referência</h4>{reviewWritingSequence(tasks,drafts)[0]?.criteria.map(c=><p key={c.id}><strong>{c.name}</strong> — {c.description}</p>)}</>}
   <button className="academy-secondary" onClick={()=>{if(window.confirm("Descartar os dois textos desta sessão?"))reset();}}>Descartar sequência</button>
  </>}
 </div>;
}
