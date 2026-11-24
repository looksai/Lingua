import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {TutorCatalogTaskView} from "../src/components/TutorCatalogTaskView";
import {TutorAudioControls} from "../src/components/TutorAudioControls";
import type {CatalogClientTask} from "../../shared/pedagogy/cal-client-delivery";
import type {TutorAudioAction} from "../../shared/pedagogy/tutor-audio-action";

const task:CatalogClientTask={
  sessionId:"fictional-browser-session-01",
  deliveryId:"fictional-browser-delivery-01",
  taskId:"hello.meaning",taskVersion:1,
  promptText:"Na frase Hello, qual é o significado?",
};

/**
 * Fixture contains no authentication, learner data, DB, recorder or network.
 * The actual production components are imported unchanged from client/src.
 * Browser E2E here only validates component interaction/visibility.
 */
function BrowserQaFixture(){
  const [active,setActive]=useState(true);
  const [rejectAck,setRejectAck]=useState(false);
  const [mismatch,setMismatch]=useState(false);
  const [ackCount,setAckCount]=useState(0);
  const [action,setAction]=useState<TutorAudioAction>("neural");
  const [recording,setRecording]=useState(false);
  const [permissionPending,setPermissionPending]=useState(false);
  const [busy,setBusy]=useState(false);
  const [neuralClicks,setNeuralClicks]=useState(0);
  const [localClicks,setLocalClicks]=useState(0);
  const [welcomeClicks,setWelcomeClicks]=useState(0);

  return <div style={{maxWidth:700,margin:"0 auto",padding:20,fontFamily:"sans-serif"}}>
    <h1>Lingua — laboratório de navegador sem dados pessoais</h1>
    <section aria-label="Configuração do teste">
      <label><input data-testid="active" type="checkbox" checked={active}
        onChange={e=>setActive(e.target.checked)}/> Consentimento/área ativa simulados</label>
      <label><input data-testid="reject-ack" type="checkbox" checked={rejectAck}
        onChange={e=>setRejectAck(e.target.checked)}/> Simular falha da confirmação</label>
      <label><input data-testid="mismatch" type="checkbox" checked={mismatch}
        onChange={e=>setMismatch(e.target.checked)}/> Texto incompatível com ticket</label>
      <output data-testid="ack-count" aria-label="Tentativas de confirmação">{ackCount}</output>
    </section>
    <section aria-label="Controles de áudio testáveis" style={{marginTop:20}}>
      <label htmlFor="action">Ação de áudio:</label>
      <select id="action" data-testid="audio-action" value={action}
        onChange={e=>setAction(e.target.value as TutorAudioAction)}>
        {(["none","player","neural","retry","local","welcome"] as TutorAudioAction[])
          .map(value=><option key={value} value={value}>{value}</option>)}
      </select>
      <label><input type="checkbox" data-testid="recording" checked={recording}
        onChange={e=>setRecording(e.target.checked)}/> Gravando</label>
      <label><input type="checkbox" data-testid="permission" checked={permissionPending}
        onChange={e=>setPermissionPending(e.target.checked)}/> Permissão pendente</label>
      <label><input type="checkbox" data-testid="busy" checked={busy}
        onChange={e=>setBusy(e.target.checked)}/> Ocupado</label>
      <TutorAudioControls action={action} tutorName="Naruto" busy={busy}
        generating={false} recording={recording} permissionPending={permissionPending}
        speakingLocally={false} hasEnglishPhrase={true} voiceUnavailable={false}
        onNeural={()=>setNeuralClicks(n=>n+1)}
        onLocal={()=>setLocalClicks(n=>n+1)}
        onWelcome={()=>setWelcomeClicks(n=>n+1)}/>
      <output data-testid="neural-clicks">{neuralClicks}</output>
      <output data-testid="local-clicks">{localClicks}</output>
      <output data-testid="welcome-clicks">{welcomeClicks}</output>
    </section>

    <div data-testid="spacer" style={{height:1350}} aria-hidden="true">
      Role a página para visualizar a tarefa
    </div>
    <div data-testid="catalog-card">
      <TutorCatalogTaskView
        text={mismatch?"Texto adulterado diferente do ticket":
          "Vamos praticar com calma.\n\n"+task.promptText}
        task={task} active={active}
        onRendered={async submitted=>{
          setAckCount(n=>n+1);
          // Deliberately reject forged or mismatched test values.
          if(submitted.deliveryId!==task.deliveryId)return false;
          return !rejectAck;
        }}/>
    </div>
  </div>;
}

const root=document.getElementById("qa-root");
if(!root)throw new Error("Browser QA fixture root missing");
createRoot(root).render(<BrowserQaFixture/>);
