import {useState} from "react";
import {Pencil} from "lucide-react";
import {trpc} from "@/lib/trpc";
import type {IeltsVariant} from "@shared/exam-contract";
import {countWritingWords,type WritingReview} from "@shared/exam-writing-contract";

export default function ExamWritingPractice({variant,allowed}:{variant:IeltsVariant;allowed:boolean}){
 const tasks=trpc.exams.writingTasks.useQuery({variant},{enabled:allowed,retry:false});
 const review=trpc.exams.writingReview.useMutation();
 const [taskId,setTaskId]=useState("");
 const [draft,setDraft]=useState("");
 const [result,setResult]=useState<WritingReview|null>(null);
 const [notice,setNotice]=useState("");
 const task=tasks.data?.find(t=>t.id===taskId)??tasks.data?.[0];
 const words=countWritingWords(draft);
 function clear(){setDraft("");setResult(null);setNotice("");}
 async function submit(){if(!task||!draft.trim())return;setNotice("");try{setResult(await review.mutateAsync({taskId:task.id,text:draft}));}catch{setNotice("Não foi possível concluir a revisão. Tente novamente.");}}
 return <section className="exam-panel">
  <div className="exam-heading"><Pencil/><h2>Treinamento de Writing</h2></div>
  <p>Produza textos originais e use critérios de autoavaliação. Não há correção linguística automática nem nota IELTS nesta etapa.</p>
  {!allowed?<p>A prática exige acesso autorizado ao piloto Premium.</p>:tasks.isPending?<p role="status">Carregando atividades...</p>:tasks.isError?<button className="academy-secondary" onClick={()=>void tasks.refetch()}>Tentar novamente</button>:task&&<>
   <label>Atividade<select value={task.id} disabled={review.isPending} onChange={e=>{if(draft&&!window.confirm("Trocar de atividade descarta o texto desta sessão. Continuar?"))return;setTaskId(e.target.value);clear();}}>{tasks.data?.map(t=><option value={t.id} key={t.id}>Task {t.kind} · {t.title}</option>)}</select></label>
   <p className="exam-muted">Mínimo recomendado: {task.minimumWords} palavras · Referência de tempo: {task.recommendedMinutes} minutos · Prática sem cronômetro.</p>
   <article className="exam-passage" lang="en"><h3>{task.title}</h3><p>{task.prompt}</p>{task.table&&<div style={{overflowX:"auto"}}><table><caption>{task.table.caption}</caption><thead><tr>{task.table.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{task.table.rows.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>}</article>
   <label>Seu texto em inglês<textarea lang="en" rows={12} maxLength={20000} value={draft} disabled={review.isPending} onChange={e=>{setDraft(e.target.value);setResult(null);}}/></label>
   <p>{words} / {task.minimumWords} palavras</p>
   <button className="academy-primary" disabled={!draft.trim()||review.isPending} onClick={()=>void submit()}>Conferir texto e abrir autoavaliação</button>
   <p className="exam-muted">O texto é enviado ao servidor Lingua para contagem. Não é enviado a uma IA externa por esta atividade nem salvo como histórico. Ao sair da página, o rascunho é perdido.</p>
   {notice&&<p role="alert">{notice}</p>}
   {result&&<div className="exam-writing-review"><h3>Revisão orientada</h3><p role="status">{result.wordCount} palavras · {result.minimumMet?"Mínimo atingido":"Abaixo do mínimo"}. A quantidade não comprova qualidade linguística.</p><h3>Perguntas para revisar sua resposta</h3>{result.reviewQuestions.map(q=><p key={q} lang="en">{q}</p>)}<h3>Critérios de referência</h3>{result.criteria.map(c=><div key={c.id}><strong>{c.name}</strong><p>{c.description}</p></div>)}<p>Autoavaliação, não parecer de examinador. Nenhuma banda atribuída.</p></div>}
  </>}
 </section>;
}
