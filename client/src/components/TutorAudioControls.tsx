import {Square,Volume2} from "lucide-react";
import type {TutorAudioAction} from "@shared/pedagogy/tutor-audio-action";

/**
 * Presentational controls only. One action per message, dictated by the
 * separately tested CAL-independent audio policy. No network or storage.
 */
export function TutorAudioControls({
  action,tutorName,busy,generating,recording,permissionPending,speakingLocally,
  hasEnglishPhrase,voiceUnavailable,onNeural,onLocal,onWelcome,
}:{
  action:TutorAudioAction;
  tutorName:string;busy:boolean;generating:boolean;recording:boolean;
  permissionPending:boolean;speakingLocally:boolean;hasEnglishPhrase:boolean;
  voiceUnavailable:boolean;
  onNeural:()=>void;onLocal:()=>void;onWelcome:()=>void;
}) {
  return <>
    {(action==="neural"||action==="retry")&&
      <button type="button" disabled={busy||recording||permissionPending} onClick={onNeural}
        aria-label={(action==="retry"?"Tentar novamente áudio de ":"Ouvir frase em inglês de ")+tutorName}
        className="mt-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-teal hover:bg-ink/5 disabled:opacity-40">
        <Volume2 size={14}/> {generating?"Preparando áudio…":action==="retry"?"Tentar novamente":"Ouvir frase em inglês"}
      </button>}
    {action==="local"&&
      <button type="button" disabled={recording||permissionPending} onClick={onLocal}
        className="mt-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-teal hover:bg-ink/5 disabled:opacity-40"
        aria-label={(speakingLocally?"Parar áudio de ":"Ouvir pela voz local de ")+tutorName}>
        {speakingLocally?<Square size={14}/>:<Volume2 size={14}/>}
        {speakingLocally?"Parar":hasEnglishPhrase?"Ouvir frase (voz local)":"Ouvir (voz local)"}
      </button>}
    {voiceUnavailable&&<p className="mt-1 text-xs text-ink-muted">Áudio externo indisponível. Mensagem preservada.</p>}
    {action==="welcome"&&
      <button type="button" disabled={busy||recording||permissionPending} onClick={onWelcome}
        className="mt-2 flex items-center gap-2 text-xs font-semibold text-teal"
        aria-label={"Preparar áudio das boas-vindas de "+tutorName}>
        <Volume2 size={15}/> Preparar áudio das boas-vindas
      </button>}
  </>;
}
