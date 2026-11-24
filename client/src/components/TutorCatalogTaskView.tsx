import React from "react";
import {useEffect,useRef,useState} from "react";
import {splitCatalogTaskText,type CatalogClientTask} from "@shared/pedagogy/cal-client-delivery";

type RenderStatus="waiting"|"sending"|"recorded"|"failed";

/**
 * UI-level signal only: confirms exact catalogue prompt exists in the browser DOM
 * and intersects the viewport. This is not proof of human attention or learning.
 */
export function TutorCatalogTaskView({
  text,task,active,onRendered,
}:{
  text:string;
  task:CatalogClientTask|null;
  active:boolean;
  onRendered:(task:CatalogClientTask)=>Promise<boolean>;
}){
  const parts=task?splitCatalogTaskText(text,task):null;
  const taskRef=useRef<HTMLElement|null>(null);
  const [status,setStatus]=useState<RenderStatus>("waiting");
  const submitted=useRef(false);
  const onRenderedRef=useRef(onRendered);
  onRenderedRef.current=onRendered;

  function report(){
    if(!task||!parts||!active||submitted.current)return;
    const element=taskRef.current;
    if(!element?.isConnected||element.textContent!==task.promptText)return;
    submitted.current=true;
    setStatus("sending");
    void onRenderedRef.current(task).then(ok=>{
      setStatus(ok?"recorded":"failed");
    }).catch(()=>setStatus("failed"));
  }

  useEffect(()=>{
    if(!parts||!task||!active||submitted.current)return;
    const element=taskRef.current;
    if(!element)return;
    if(typeof IntersectionObserver!=="undefined"){
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))report();
      },{threshold:0.01});
      observer.observe(element);
      return ()=>observer.disconnect();
    }
    // Do not claim a render receipt for an unsupported visibility observer.
    // The learner can explicitly confirm using the control below.
    return;
  },[task?.deliveryId,active,Boolean(parts)]);

  if(!parts||!task)
    return <p className="whitespace-pre-wrap break-words leading-6">{text}</p>;
  return <>
    {parts.explanation&&<p className="whitespace-pre-wrap break-words leading-6">{parts.explanation}</p>}
    <section ref={taskRef} aria-label="Atividade do catálogo do Lingua"
      className="mt-3 rounded-xl border border-teal/20 bg-white p-3">
      <p className="whitespace-pre-wrap break-words leading-6">{parts.taskText}</p>
    </section>
    {status==="sending"&&<p role="status" className="mt-1 text-xs text-ink-muted">Confirmando apresentação da atividade…</p>}
    {status==="failed"&&<p role="status" className="mt-1 text-xs text-ink-muted">
      A confirmação não chegou ao servidor. Você pode tentar novamente; sua resposta não será avaliada antes disso.
    </p>}
    {(status==="waiting"||status==="failed")&&
      <button type="button" disabled={!active} onClick={()=>{
        submitted.current=false;
        report();
      }} className="mt-2 text-xs font-semibold text-teal underline">
        Confirmar que a atividade apareceu
      </button>}
  </>;
}
