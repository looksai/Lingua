import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import TutorChat,type {TutorVoiceSettings} from "../src/components/TutorChat";
import {qaTutorRpc} from "./tutorchat-trpc-fixture";

function FullTutorChatQa(){
  const [account,setAccount]=useState("qa-a@synthetic.invalid");
  const [voiceSettings,setVoiceSettings]=useState<TutorVoiceSettings>({
    voiceURI:"",rate:1,pitch:1,neuralVoice:"troy",
  });
  (window as any).__tutorChatQa={
    account:()=>account,
    calls:()=>qaTutorRpc.calls,
    holdNextReply:()=>qaTutorRpc.holdNextReply(),
    resolveHeldReply:(value?:string)=>qaTutorRpc.resolveHeldReply(value),
    rejectHeldReply:()=>qaTutorRpc.rejectHeldReply(),
    pendingCount:()=>qaTutorRpc.pendingCount(),
    switchAccount:(id:"a"|"b")=>
      setAccount("qa-"+id+"@synthetic.invalid"),
  };
  return <>
    <TutorChat profile={{tutorName:"Naruto",tutorPersona:"welcoming",interest:"work"}}
      accountEmail={account} voiceSettings={voiceSettings}
      onVoiceSettingsChange={setVoiceSettings}
      onOpenTutorSettings={()=>{}} placementRequested={false}
      onPlacementCompleted={()=>{}}/>
    <div aria-label="Controles de conta sintética" style={{
      position:"fixed",left:4,top:4,zIndex:100,
      background:"white",border:"1px solid #ccc",padding:4,
    }}>
      <button data-testid="qa-switch" type="button" onClick={()=>
        setAccount(a=>a.includes("qa-a")?
          "qa-b@synthetic.invalid":"qa-a@synthetic.invalid")}>
        Trocar conta fictícia
      </button>
      <output data-testid="qa-account">{account}</output>
    </div>
  </>;
}
const root=document.getElementById("qa-root");
if(!root)throw Error("TutorChat QA root missing");
createRoot(root).render(<FullTutorChatQa/>);
