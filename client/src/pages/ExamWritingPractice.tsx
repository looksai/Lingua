import {useState} from "react";
import ExamWritingSequence from "./ExamWritingSequence";
import {Pencil} from "lucide-react";
import {trpc} from "@/lib/trpc";
import type {IeltsVariant} from "@shared/exam-contract";
import {countWritingWords,type WritingReview} from "@shared/exam-writing-contract";

export default function ExamWritingPractice({variant,allowed,feedbackProvider,onOutcome}:{variant:IeltsVariant;allowed:boolean;feedbackProvider?:"groq"|"openai"|"off"|null;onOutcome?:(status:"completed"|"expired"|"skipped")=>void}){
 const tasks=trpc.exams.writingTasks.useQuery({variant},{enabled:allowed,retry:false});
 const review=trpc.exams.writingReview.useMutation();
 const ai=trpc.exams.writingFeedback.useMutation();
 const [feedback,setFeedback]=useState<{criterion:string;excerpt:string;observation:string;suggestion:string}|null>(null);
 const busy=review.isPending||ai.isPending;
 const [sequenceMode,setSequenceMode]=useState(Boolean(onOutcome));
 const [taskId,setTaskId]=useState("");
 const [draft,setDraft]=useState("");
 const [result,setResult]=useState<WritingReview|null>(null);
 const [notice,setNotice]=useState("");
 const task=tasks.data?.find(t=>t.id===taskId)??tasks.data?.[0];
 const words=countWritingWords(draft);
 function clear(){setDraft("");setResult(null);setFeedback(null);setNotice("");}
 async function submit(){if(!task||!draft.trim())return;setNotice("");try{setResult(await review.mutateAsync({taskId:task.id,text:draft}));}catch{setNotice("Não foi possível concluir a revisão. Tente novamente.");}}
 async function askFeedback(){if(!task||!draft.trim()||draft.length>8000||!feedbackProvider||feedbackProvider==="off")return;setNotice("");setFeedback(null);try{const response=await ai.mutateAsync({variant,taskId:task.id,text:draft,consent:true});setFeedback(response.feedback);if(!response.feedback)setNotice("Não foi possível produzir uma sugestão fundamentada. Use a autoavaliação.");}catch{setNotice("Feedback indisponível. Verifique a autorização de IA e os limites do tutor.");}}
 return <section className="exam-panel">
  <div className="exam-heading"><Pencil/><h2>Treinamento de Writing</h2></div>
  <p>Produza textos originais e use critérios de autoavaliação. A autoavaliação não atribui nota IELTS. O feedback do tutor, quando habilitado, é experimental.</p>
  {allowed&&tasks.data&&<nav aria-label="Modo Writing"><button className="academy-secondary" aria-pressed={!sequenceMode} disabled={busy} onClick={()=>{if(sequenceMode&&!window.confirm("Sair da sequência descarta seus textos. Continuar?"))return;setSequenceMode(false);}}>Prática individual</button><button className="academy-secondary" aria-pressed={sequenceMode} disabled={busy} onClick={()=>{if(!sequenceMode&&draft&&!window.confirm("Trocar de modo descarta o rascunho individual. Continuar?"))return;clear();setSequenceMode(true);}}>Sequência de duas tarefas</button></nav>}
  {sequenceMode&&allowed&&tasks.data?<ExamWritingSequence tasks={tasks.data} allowed={allowed} onOutcome={onOutcome}/>:!allowed?<p>A prática exige acesso autorizado ao piloto Premium.</p>:tasks.isPending?<p role="status">Carregando atividades...</p>:tasks.isError?<button className="academy-secondary" onClick={()=>void tasks.refetch()}>Tentar novamente</button>:task&&<>
   <label>Atividade<select value={task.id} disabled={busy} onChange={e=>{if(draft&&!window.confirm("Trocar de atividade descarta o texto desta sessão. Continuar?"))return;setTaskId(e.target.value);clear();}}>{tasks.data?.map(t=><option value={t.id} key={t.id}>Task {t.kind} · {t.title}</option>)}</select></label>
   <p className="exam-muted">Mínimo recomendado: {task.minimumWords} palavras · Referência de tempo: {task.recommendedMinutes} minutos · Prática sem cronômetro.</p>
   <article className="exam-passage" lang="en"><h3>{task.title}</h3><p>{task.prompt}</p>{task.table&&<div style={{overflowX:"auto"}}><table><caption>{task.table.caption}</caption><thead><tr>{task.table.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{task.table.rows.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>}</article>
   <label>Seu texto em inglês<textarea lang="en" rows={12} maxLength={20000} value={draft} disabled={busy} onChange={e=>{setDraft(e.target.value);setResult(null);setFeedback(null);}}/></label>
   <p>{words} / {task.minimumWords} palavras</p>
   <button className="academy-primary" disabled={!draft.trim()||busy} onClick={()=>void submit()}>Conferir texto e abrir autoavaliação</button>
   <p className="exam-muted">O texto é enviado ao servidor Lingua para contagem. A contagem não envia o texto a uma IA externa nem o salva como histórico. Ao sair da página, o rascunho é perdido.</p>
   {feedbackProvider&&feedbackProvider!=="off"&&<div className="exam-writing-review"><h3>Feedback experimental do tutor</h3><p>Ao solicitar, o enunciado e seu texto serão enviados ao provedor {feedbackProvider==="groq"?"Groq":"OpenAI"}, usando a franquia de teste do tutor. Não inclua dados pessoais. Requer autorização de IA no perfil. Uma sugestão qualitativa, sem nota.</p><button className="academy-secondary" disabled={busy||!draft.trim()||draft.length>8000} onClick={()=>void askFeedback()}>Enviar texto ao tutor para feedback</button>{draft.length>8000&&<p>Limite do feedback experimental: 8.000 caracteres.</p>}{feedback&&<div><h3>Sugestão do tutor (IA, não validada)</h3><blockquote lang="en">{feedback.excerpt}</blockquote><p>{feedback.observation}</p><p>{feedback.suggestion}</p></div>}</div>}
   {notice&&<p role="alert">{notice}</p>}
   {result&&<div className="exam-writing-review"><h3>Revisão orientada</h3><p role="status">{result.wordCount} palavras · {result.minimumMet?"Mínimo atingido":"Abaixo do mínimo"}. A quantidade não comprova qualidade linguística.</p><h3>Perguntas para revisar sua resposta</h3>{result.reviewQuestions.map(q=><p key={q} lang="en">{q}</p>)}<h3>Critérios de referência</h3>{result.criteria.map(c=><div key={c.id}><strong>{c.name}</strong><p>{c.description}</p></div>)}<p>Autoavaliação, não parecer de examinador. Nenhuma banda atribuída.</p></div>}
  </>}
 </section>;
}
