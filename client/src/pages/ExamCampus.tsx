import { useEffect, useState } from "react";
import { Trophy, Target, ArrowRight, BookOpen, Headphones, Pencil, Mic, ClipboardCheck, Clock, Calendar, LockKeyhole } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EXAM_CATALOG, type ExamAttempt, type ExamResult, type ExamMode, type ExamSkill, type IeltsVariant } from "@shared/exam-contract";
import "./academy-exams.css";

export default function ExamCampus(){
 const overview=trpc.exams.overview.useQuery(undefined,{retry:false});
 const start=trpc.exams.start.useMutation();
 const submit=trpc.exams.submit.useMutation();
 const [variant,setVariant]=useState<IeltsVariant>("ielts-academic");
 const [skill,setSkill]=useState<ExamSkill>("reading");
 const [exerciseId,setExerciseId]=useState("");
 const [playing,setPlaying]=useState(false);
 const [goal,setGoal]=useState("");
 const [date,setDate]=useState("");
 const [attempt,setAttempt]=useState<ExamAttempt|null>(null);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<ExamResult|null>(null);
 const [now,setNow]=useState(Date.now);
 const [notice,setNotice]=useState("");
 const [section,setSection]=useState("overview");
 const allowed=Boolean(overview.data?.plan);
 const exercises=trpc.exams.exercises.useQuery({variant,skill},{enabled:allowed&&section==="training"&&!attempt,retry:false});
 const speechAvailable=typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
 useEffect(()=>()=>{if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();},[]);
 function stopAudio(){if(speechAvailable)window.speechSynthesis.cancel();setPlaying(false);}
 function playAudio(){if(!attempt||!speechAvailable)return;stopAudio();const audio=new SpeechSynthesisUtterance(attempt.exercise.passage);audio.lang="en-GB";audio.rate=0.92;audio.onend=()=>setPlaying(false);audio.onerror=()=>{setPlaying(false);setNotice("A reprodução não está disponível neste dispositivo.");};setPlaying(true);window.speechSynthesis.speak(audio);}
 const seconds=attempt?Math.max(0,Math.ceil((attempt.deadline-now)/1000)):0;
 useEffect(()=>{if(!attempt||result)return;const id=window.setInterval(()=>setNow(Date.now()),500);return()=>window.clearInterval(id);},[attempt,result]);
 const selected=EXAM_CATALOG.find(x=>x.id===variant)!;
 async function begin(mode:ExamMode){
  stopAudio();setNotice("");setResult(null);setAttempt(null);setAnswers({});
  try{const next=await start.mutateAsync({variant,mode,skill:mode==="timed"?"reading":skill,exerciseId:mode==="practice"&&exercises.data?.some(x=>x.id===exerciseId)?exerciseId:undefined});setNow(Date.now());setAttempt(next);setSection("training");}catch{setNotice("Não foi possível iniciar a atividade. Confira seu acesso e tente novamente.");}
 }
 async function finish(){
  if(!attempt)return;
  stopAudio();setNotice("");
  try{setResult(await submit.mutateAsync({attemptId:attempt.id,answers}));}catch{setNotice("Não foi possível corrigir. Confira a conexão ou inicie uma nova atividade se o tempo acabou.");}
 }
 const busy=start.isPending||submit.isPending;
 function go(next:string){stopAudio();setSection(next);setNotice("");}
 function chooseSkill(next:ExamSkill){stopAudio();setSkill(next);setExerciseId("");setAttempt(null);setResult(null);setAnswers({});go("training");}
 return <div className="academy-exams">
  <section className="exam-hero"><div><p className="exam-eyebrow">LINGUA · CENTRO DE EXAMES</p><h1>Exames de Proficiência</h1><span/><p>Prepare-se para certificações internacionais com método, prática dirigida e acompanhamento pedagógico.</p></div></section>
  <nav className="exam-tabs" aria-label="Centro de exames">{[["overview","Visão geral"],["goal","Meu objetivo"],["training","Treinamento"],["mock","Simulados"],["results","Minha evolução"],["guidance","Orientações"]].map(([id,label])=><button type="button" key={id} aria-current={section===id?"page":undefined} onClick={()=>go(id!)}>{label}</button>)}</nav>
  {notice&&<p role="alert" className="exam-notice">{notice}</p>}
  {overview.isPending?<p role="status">Confirmando seu acesso...</p>:overview.isError?<div className="exam-panel"><p>Não foi possível confirmar seu acesso.</p><button className="academy-secondary" onClick={()=>void overview.refetch()}>Tentar novamente</button></div>:<div className="exam-access"><LockKeyhole size={20}/><div><strong>{allowed?"Piloto autorizado · "+(overview.data?.plan==="community"?"Comunidade Premium":"Lingua Premium"):"Benefício dos planos Lingua Premium e Comunidade Premium"}</strong><p>{allowed?"Acesso experimental de preparação. Não representa assinatura paga.":"O catálogo está disponível para consulta. O treinamento requer autorização Premium; contratação ainda em preparação."}</p></div></div>}
  {section==="overview"&&<>
   <section><div className="exam-heading"><Trophy/><div><h2>Escolha o seu exame</h2><p>Começamos por IELTS Academic e General Training.</p></div></div><div className="exam-catalog">{EXAM_CATALOG.map(exam=><button key={exam.id} type="button" className="exam-card" aria-pressed={exam.id===variant} disabled={busy} onClick={()=>{if(exam.status==="pilot"){setVariant(exam.id);go("goal");}else setNotice(exam.name+" — preparação em desenvolvimento.");}}><h3>{exam.name}</h3><p>{exam.purpose}</p><small>{exam.status==="pilot"?"Reading e Listening · piloto":"Em preparação"}</small><ArrowRight size={17}/></button>)}</div></section>
   <div className="exam-columns"><section className="exam-panel"><div className="exam-heading"><Target/><h2>Minha preparação</h2></div><h3>{selected.name}</h3><p>Meta: {goal||"a definir"}</p><p>Data: {date||"a definir"}</p><button className="academy-secondary" onClick={()=>go("goal")}>Definir objetivo</button><p className="exam-muted">Nenhuma nota de proficiência estimada sem avaliação validada.</p></section>
   <section className="exam-panel"><div className="exam-heading"><ClipboardCheck/><h2>Jornada de preparação</h2></div><div className="exam-journey">{["Objetivo","Diagnóstico","Plano","Treinamento","Simulados","Análise","Prontidão"].map((v,i)=><span key={v}><b>{i+1}</b>{v}</span>)}</div><p>O piloto oferece leitura e compreensão auditiva com voz sintética. O plano adaptativo e a avaliação de prontidão estão em desenvolvimento.</p></section></div>
   <section><div className="exam-heading"><BookOpen/><div><h2>Treinamento por competência</h2><p>Quatro habilidades, com critérios específicos de cada exame.</p></div></div><div className="exam-skills">{[{name:"Reading",desc:"Leitura e interpretação",Icon:BookOpen,active:true},{name:"Listening",desc:"Compreensão auditiva",Icon:Headphones,active:true},{name:"Writing",desc:"Produção de textos",Icon:Pencil},{name:"Speaking",desc:"Fluência e comunicação",Icon:Mic}].map(({name,desc,Icon,active})=><button key={name} type="button" onClick={()=>active?chooseSkill(name==="Listening"?"listening":"reading"):setNotice(name+" — conteúdo e avaliação em preparação.")}><Icon/><h3>{name}</h3><p>{desc}</p><small>{active?"Piloto de prática":"Em preparação"}</small></button>)}</div></section>
   <section className="exam-plan-banner"><div className="exam-plan-art" aria-hidden="true"/><div><h2>Plano de preparação personalizado</h2><p>Defina seu exame, objetivo e prazo. O planejamento adaptativo está em desenvolvimento.</p><button className="academy-primary" onClick={()=>go("goal")}>Definir meu objetivo <ArrowRight size={16}/></button></div></section>
  </>}
  {section==="goal"&&<section className="exam-panel"><div className="exam-heading"><Target/><h2>Meu objetivo</h2></div><label>Exame<select value={variant} disabled={busy} onChange={e=>setVariant(e.target.value as IeltsVariant)}><option value="ielts-academic">IELTS Academic</option><option value="ielts-general">IELTS General Training</option></select></label><label>Meta de pontuação (opcional)<select value={goal} onChange={e=>setGoal(e.target.value)}><option value="">A definir</option>{Array.from({length:19},(_,i)=>(i/2).toFixed(1)).map(v=><option key={v}>{v}</option>)}</select></label><label>Data planejada (opcional)<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><p className="exam-muted">Objetivo mantido nesta sessão da página, ainda sem armazenamento permanente.</p><button className="academy-primary" onClick={()=>go("training")}>Ir ao treinamento <ArrowRight size={16}/></button></section>}
  {section==="mock"&&<section className="exam-panel"><div className="exam-heading"><Clock/><h2>Simulados</h2></div><p>Miniatividade cronometrada de leitura: 4 questões originais, 5 minutos, sem correção durante a tentativa. Não é um IELTS completo, não impede consulta externa e não estima uma banda IELTS.</p><button className="academy-primary" disabled={!allowed||busy} onClick={()=>void begin("timed")}>Iniciar miniatividade</button><p className="exam-muted">Simulados completos e modo examinador oral ainda não disponíveis.</p></section>}
  {section==="training"&&<section className="exam-panel"><div className="exam-heading"><BookOpen/><h2>Treinamento de {attempt?.exercise.skill==="listening"||(!attempt&&skill==="listening")?"compreensão auditiva":"leitura"}</h2></div>{!attempt?<><p>{selected.name} · 4 questões originais, feedback explicativo após envio.</p><label>Competência<select value={skill} onChange={e=>chooseSkill(e.target.value as ExamSkill)}><option value="reading">Reading</option><option value="listening">Listening</option></select></label>{skill==="listening"&&<p className="exam-muted">Prática com voz sintética do navegador, não áudio oficial. A qualidade depende das vozes instaladas. Não é simulado de Listening.</p>}{allowed&&<label>Atividade<select value={exerciseId} onChange={e=>setExerciseId(e.target.value)}><option value="">Primeira atividade disponível</option>{exercises.data?.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>}<button className="academy-primary" disabled={!allowed||busy||exercises.isPending||exercises.isError||(skill==="listening"&&!speechAvailable)} onClick={()=>void begin("practice")}>Iniciar prática</button></>:<>
  <p className="exam-muted">{attempt.variant==="ielts-academic"?"Academic":"General Training"} · {attempt.mode==="timed"?"Miniatividade cronometrada":"Prática"} · {attempt.version}</p>
  {!result&&<p role="status">Tempo restante: {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</p>}
  <article className="exam-passage"><h3 lang="en">{attempt.exercise.title}</h3>{attempt.exercise.skill==="listening"?<><p>Ouça o conteúdo em inglês e responda às perguntas. Nesta prática, você pode repetir a reprodução.</p><button className="academy-secondary" disabled={!speechAvailable||seconds===0||busy} onClick={playing?stopAudio:playAudio}>{playing?"Parar áudio":"Ouvir áudio"}</button>{result&&<p lang="en">{attempt.exercise.passage}</p>}</>:<p lang="en">{attempt.exercise.passage}</p>}</article>
  {attempt.exercise.questions.map((q,i)=><fieldset key={q.id} className="exam-question" disabled={Boolean(result)||busy||seconds===0}><legend lang="en">{i+1}. {q.prompt}</legend>{q.options.map(option=><label key={option} lang="en"><input type="radio" name={q.id} checked={answers[q.id]===option} onChange={()=>setAnswers(old=>({...old,[q.id]:option}))}/>{option}</label>)}{result&&<p className="exam-feedback" lang="en">{result.items.find(x=>x.id===q.id)?.correct?"Correct":"Review"} · {result.items.find(x=>x.id===q.id)?.expected}. {result.items.find(x=>x.id===q.id)?.explanation}</p>}</fieldset>)}
  {result?<><p role="status">Resultado: {result.correct}/{result.total} acertos. Não corresponde a uma nota IELTS.</p><button className="academy-secondary" onClick={()=>{stopAudio();setAttempt(null);setAnswers({});setResult(null);}}>Nova prática</button></>:<><button className="academy-primary" disabled={!allowed||busy||seconds===0} onClick={()=>void finish()}>Enviar respostas</button>{seconds===0&&<button className="academy-secondary" onClick={()=>{stopAudio();setAttempt(null);}}>Tempo encerrado · Reiniciar</button>}</>}
  </>}</section>}
  {section==="results"&&<section className="exam-panel"><div className="exam-heading"><Target/><h2>Minha evolução</h2></div>{result?<p>Última atividade desta sessão: {result.correct}/{result.total} acertos.</p>:<p>Nenhum resultado nesta sessão.</p>}<p>Histórico durável, diagnóstico adaptativo e estimativa de proficiência em preparação. A atividade não gera evidência certificadora no CSLE.</p></section>}
  {section==="guidance"&&<section className="exam-panel"><div className="exam-heading"><Calendar/><h2>Orientações para a prova</h2></div><p>Academic e General Training têm Reading e Writing distintos; Listening e Speaking seguem o mesmo formato. O Reading oficial dura 60 minutos, diferente da miniatividade Lingua.</p><p>Consulte a instituição responsável para verificar requisitos e condições atualizados.</p><a href="https://ielts.org/take-a-test/test-types/ielts-academic-test" target="_blank" rel="noopener noreferrer">IELTS Academic · site oficial</a><a href="https://ielts.org/take-a-test/test-types/ielts-general-training-test" target="_blank" rel="noopener noreferrer">IELTS General Training · site oficial</a><p className="exam-muted">Preparação independente, sem vínculo ou certificação oficial.</p></section>}
 </div>;
}
