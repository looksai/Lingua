import React,{useCallback,useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {TutorCatalogTaskView} from "../src/components/TutorCatalogTaskView";
import type {CatalogClientTask} from "../../shared/pedagogy/cal-client-delivery";

type TutorResponse={
  text:string;source:string;catalogTask?:CatalogClientTask|null;
};
type RpcResult<T>={
  result?:{data?:{json?:T}};
  error?:{json?:{message?:string;data?:{code?:string}}};
};
const cacheKey="lingua:synthetic-http-qa:current-task";
async function mutation<T>(procedure:string,input:unknown):Promise<T>{
  const response=await fetch("/api/trpc/tutor."+procedure,{
    method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({json:input??null}),
  });
  const body=await response.json() as RpcResult<T>;
  if(!response.ok||!body.result||!("data" in body.result))
    throw new Error(body.error?.json?.data?.code??"HTTP_"+response.status);
  return body.result.data?.json as T;
}

/**
 * Browser fixture with the REAL TutorCatalogTaskView and real tRPC HTTP
 * transport. No auth form, model, production DB, teacher UI, CSLE or SRS.
 */
function SyntheticHttpQa(){
  const [text,setText]=useState("");
  const [task,setTask]=useState<CatalogClientTask|null>(null);
  const [message,setMessage]=useState("Quero praticar Hello");
  const [origin,setOrigin]=useState<"typed"|"asr_text">("typed");
  const [consent,setConsent]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [ack,setAck]=useState("waiting");
  const [recovered,setRecovered]=useState("no");

  const load=useCallback(async()=>{
    try {
      const pending=await mutation<CatalogClientTask|null>("catalogPendingTask",null);
      if(!pending)return;
      // The real server owns the pending ticket; test-only local text restores
      // the exact response to satisfy the same DOM suffix guard as production.
      const raw=sessionStorage.getItem(cacheKey);
      if(!raw)return;
      const previous=JSON.parse(raw) as {text:string;task:CatalogClientTask};
      if(previous.task.deliveryId!==pending.deliveryId||
         previous.task.sessionId!==pending.sessionId)return;
      setText(previous.text);setTask(pending);setRecovered("yes");
    }catch{/* anonymous context and stale pending task stay fail-closed */}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function send(
    override?:{message:string;origin?:"typed"|"asr_text";restart?:boolean},
  ){
    setError("");setBusy(true);
    try{
      const result=await mutation<TutorResponse>("reply",{
        message:override?.message??message,
        consent,provider:"groq",voice:false,history:[],
        inputModality:override?.origin??origin,
        ...(override?.restart?{
          catalogCompetencyId:"greeting.hello",catalogRestart:true,
          inputModality:undefined,
        }:{}),
      });
      setText(result.text);
      setTask(result.catalogTask??null);
      setAck("waiting");
      if(result.catalogTask)
        sessionStorage.setItem(cacheKey,JSON.stringify({
          task:result.catalogTask,text:result.text,
        }));
      else sessionStorage.removeItem(cacheKey);
    }catch(e){setError(String(e));}
    finally{setBusy(false);}
  }
  async function onRendered(pending:CatalogClientTask):Promise<boolean>{
    try{
      const result=await mutation<{status:string}>("catalogRenderAck",{
        consent:true,sessionId:pending.sessionId,deliveryId:pending.deliveryId,
      });
      setAck(result.status);
      return result.status==="recorded"||result.status==="duplicate";
    }catch(e){setError(String(e));setAck("failed");return false;}
  }

  return <div style={{maxWidth:680,margin:"auto",padding:20,fontFamily:"sans-serif"}}>
    <h1>Lingua QA — HTTP autenticado sintético</h1>
    <p>Contas de laboratório. Nenhum dado pedagógico oficial.</p>
    <label>Mensagem fictícia
      <input data-testid="message" value={message} onChange={e=>setMessage(e.target.value)}/>
    </label>
    <label>Modalidade
      <select data-testid="modality" value={origin}
        onChange={e=>setOrigin(e.target.value as "typed"|"asr_text")}>
        <option value="typed">Digitada (alegada)</option>
        <option value="asr_text">Transcrição ASR</option>
      </select>
    </label>
    <label><input type="checkbox" data-testid="consent"
      checked={consent} onChange={e=>setConsent(e.target.checked)}/>
      Consentimento da chamada de IA</label>
    <button type="button" data-testid="send" disabled={busy}
      onClick={()=>void send()}>Enviar mensagem</button>
    <button type="button" data-testid="reset" disabled={busy}
      onClick={()=>void send({message:"Quero recomeçar Hello",restart:true})}>
      Recomeçar objetivo</button>
    <output data-testid="ack-status">{ack}</output>
    <output data-testid="recovered">{recovered}</output>
    <output data-testid="error">{error}</output>
    <div data-testid="scroll-space" style={{height:1300}} aria-hidden="true"/>
    <article data-testid="lesson">
      <TutorCatalogTaskView key={task?.deliveryId??"empty"} text={text}
        task={task} active={consent&&!busy} onRendered={onRendered}/>
    </article>
  </div>;
}

const root=document.getElementById("qa-root");
if(!root)throw new Error("Browser QA fixture root absent");
createRoot(root).render(<SyntheticHttpQa/>);
