import {useEffect,useRef,useState} from "react";
import {Mic} from "lucide-react";
import {trpc} from "@/lib/trpc";
import {oralSequence,type SpeakingPrompt} from "@shared/exam-speaking-contract";

export default function ExamSpeakingPractice({allowed}:{allowed:boolean}){
 const catalogue=trpc.exams.speakingPrompts.useQuery(undefined,{enabled:allowed,retry:false});
 const [mode,setMode]=useState<"practice"|"sequence">("practice");
 const [index,setIndex]=useState(0);
 const [clips,setClips]=useState<{task:SpeakingPrompt;url:string}[]>([]);
 const clipRefs=useRef<string[]>([]);
 const [id,setId]=useState("");
 const [phase,setPhase]=useState<"idle"|"preparing"|"requesting"|"recording"|"review"|"between"|"complete">("idle");
 const [remaining,setRemaining]=useState(0);
 const [audioUrl,setAudioUrl]=useState("");
 const [notice,setNotice]=useState("");
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),url=useRef(""),generation=useRef(0),timer=useRef<number|null>(null);
 const sequence=oralSequence(catalogue.data?.prompts??[]);
 const task=mode==="sequence"?sequence[index]:(catalogue.data?.prompts.find(p=>p.id===id)??catalogue.data?.prompts[0]);
 const supported=typeof navigator!=="undefined"&&Boolean(navigator.mediaDevices?.getUserMedia)&&typeof MediaRecorder!=="undefined";
 function release(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;}
 function reset(){
  generation.current++;
  if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}
  const current=recorder.current;recorder.current=null;
  if(current&&current.state!=="inactive")current.stop();
  release();
  if(url.current){URL.revokeObjectURL(url.current);url.current="";}
 }
 function discardClips(){for(const clip of clipRefs.current)URL.revokeObjectURL(clip);clipRefs.current=[];}
 useEffect(()=>()=>{reset();discardClips();},[]);
 function clear(){reset();setAudioUrl("");setPhase("idle");setRemaining(0);setNotice("");}
 function switchMode(next:"practice"|"sequence"){clear();discardClips();setClips([]);setIndex(0);setMode(next);}
 function advance(){if(index+1===sequence.length){setPhase("complete");return;}clear();setIndex(index+1);}
 function countdown(seconds:number,onEnd:()=>void){
  if(timer.current!==null)window.clearInterval(timer.current);
  const deadline=Date.now()+seconds*1000;setRemaining(seconds);
  timer.current=window.setInterval(()=>{const next=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(next);if(next===0){if(timer.current!==null)window.clearInterval(timer.current);timer.current=null;onEnd();}},250);
 }
 function stop(){if(recorder.current?.state==="recording")recorder.current.stop();if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}}
 async function record(){
  if(!task||!supported)return;
  reset();setAudioUrl("");setNotice("");setPhase("requesting");
  const token=generation.current;
  try{
   const mic=await navigator.mediaDevices.getUserMedia({audio:true});
   if(generation.current!==token){mic.getTracks().forEach(t=>t.stop());return;}
   stream.current=mic;
   const current=new MediaRecorder(mic);recorder.current=current;
   const chunks:Blob[]=[];let bytes=0;let oversized=false;
   current.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;if(bytes<=16*1024*1024)chunks.push(e.data);else{oversized=true;stop();}}};
   current.onerror=()=>{if(generation.current!==token)return;clear();setNotice("Falha na gravação. Tente novamente.");};
   current.onstop=()=>{
    if(generation.current!==token)return;
    if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}
    release();recorder.current=null;
    if(oversized||!chunks.length){setPhase("idle");setNotice(oversized?"Limite da gravação excedido.":"Nenhum áudio capturado.");return;}
    const blob=new Blob(chunks,{type:current.mimeType||chunks[0]?.type||"audio/webm"});
    if(mode==="sequence"){const clipUrl=URL.createObjectURL(blob);clipRefs.current.push(clipUrl);setClips(old=>[...old,{task,url:clipUrl}]);setPhase("between");}else{url.current=URL.createObjectURL(blob);setAudioUrl(url.current);setPhase("review");}
   };
   current.start(1000);setPhase("recording");countdown(task.practiceSeconds,stop);
  }catch{if(generation.current!==token)return;clear();setNotice("Não foi possível acessar o microfone. Verifique a permissão do navegador.");}
 }
 function prepare(){if(!task)return;clear();setPhase("preparing");countdown(task.preparationSeconds,()=>{setPhase("idle");setNotice("Tempo de preparação concluído. Inicie sua gravação quando estiver pronto.");});}
 return <section className="exam-panel"><div className="exam-heading"><Mic/><h2>Treinamento de Speaking</h2></div>
 <p>Pratique as três partes ou percorra uma sequência de perguntas sem revisão entre respostas. Não é entrevista dinâmica com IA nem avaliação de pronúncia.</p>
 {!allowed?<p>A prática exige acesso autorizado ao piloto Premium.</p>:catalogue.isPending?<p role="status">Carregando atividades...</p>:catalogue.isError?<button className="academy-secondary" onClick={()=>void catalogue.refetch()}>Tentar novamente</button>:<>
 {catalogue.data&&<nav className="exam-tabs" aria-label="Modalidade oral"><button type="button" aria-current={mode==="practice"?"page":undefined} disabled={phase==="recording"||phase==="requesting"} onClick={()=>{if(mode!=="practice"&&(!clips.length||window.confirm("Descartar a sequência gravada?")))switchMode("practice");}}>Prática individual</button><button type="button" aria-current={mode==="sequence"?"page":undefined} disabled={!sequence.length||phase==="recording"||phase==="requesting"} onClick={()=>{if(mode!=="sequence")switchMode("sequence");}}>Sequência oral guiada</button></nav>}
 {task&&<>
 {mode==="sequence"&&<p className="exam-muted">Sequência original de {sequence.length} perguntas. Revisão somente após concluir todas as respostas. Não é um IELTS completo ou prova protegida contra consultas.</p>}
 {phase!=="complete"&&<>
 {mode==="practice"&&<label>Atividade<select value={task.id} disabled={phase==="recording"||phase==="requesting"} onChange={e=>{clear();setId(e.target.value);}}>{catalogue.data?.prompts.map(p=><option key={p.id} value={p.id}>Part {p.part} · {p.title}</option>)}</select></label>}
 {mode==="sequence"&&<p>Questão {index+1} de {sequence.length} · Part {task.part}</p>}
 <article className="exam-passage" lang="en"><h3>{task.title}</h3><p>{task.question}</p></article>
 <p>Tempo sugerido de resposta: {task.practiceSeconds} segundos. {task.preparationSeconds>0&&"Preparação: 60 segundos."}</p>
 {!supported&&<p role="alert">Este navegador não oferece gravação de áudio compatível.</p>}
 {phase==="preparing"&&<p role="status">Preparação: {remaining} s</p>}
 {phase==="recording"&&<p role="status">Gravando: {remaining} s restantes</p>}
 {phase==="requesting"&&<p role="status">Aguardando permissão do microfone...</p>}
 {phase==="idle"&&task.preparationSeconds>0&&<button className="academy-secondary" onClick={prepare}>Preparar por 1 minuto</button>}
 {(phase==="idle"||phase==="preparing")&&<button className="academy-primary" disabled={!supported} onClick={()=>void record()}>Gravar resposta</button>}
 {phase==="recording"&&<button className="academy-primary" onClick={stop}>Encerrar gravação</button>}
 {phase==="requesting"&&<button className="academy-secondary" onClick={clear}>Cancelar</button>}
 {notice&&<p role="status">{notice}</p>}
 {phase==="between"&&<><p role="status">Resposta gravada. A revisão será exibida ao final.</p><button className="academy-primary" onClick={advance}>{index+1===sequence.length?"Concluir sequência":"Próxima pergunta"}</button></>}
 {phase==="review"&&audioUrl&&<div className="exam-writing-review"><h3>Escute sua resposta</h3><audio controls src={audioUrl}/><h3>Autoavaliação</h3>{task.review.map(q=><p key={q} lang="en">{q}</p>)}{catalogue.data?.criteria.map(c=><div key={c.name}><strong>{c.name}</strong><p>{c.description}</p></div>)}<button className="academy-secondary" onClick={clear}>Descartar e praticar novamente</button></div>}
 </>}
 {phase==="complete"&&<div className="exam-writing-review"><h3>Revisão da sequência oral</h3><p>{clips.length} respostas gravadas. Nenhuma nota atribuída.</p>{clips.map((clip,i)=><section key={clip.task.id}><h3>{i+1}. {clip.task.title}</h3><p lang="en">{clip.task.question}</p><audio controls src={clip.url}/>{clip.task.review.map(q=><p key={q} lang="en">{q}</p>)}</section>)}{catalogue.data?.criteria.map(c=><div key={c.name}><strong>{c.name}</strong><p>{c.description}</p></div>)}<button className="academy-secondary" onClick={()=>switchMode("sequence")}>Descartar e reiniciar sequência</button></div>}
 <p className="exam-muted">A gravação permanece apenas no navegador enquanto a atividade está aberta. Não é enviada ao servidor ou a uma IA. Nenhuma nota é atribuída. Ao sair, o áudio é descartado.</p>
 </>}
 </>}
 </section>;
}
