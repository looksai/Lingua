import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { MessageCircle, Mic, Minus, Send, Square, Volume2, Settings2, ChevronLeft } from "lucide-react";
import {availableLocalVoices,selectLocalVoice,speechText} from "@/lib/tutor-speech";
import { trpc } from "@/lib/trpc";
import { greeting, TUTOR_MAX_AUDIO_BYTES, TUTOR_MAX_HISTORY, TUTOR_MAX_RECORD_MS,
  TUTOR_MAX_TEXT, tutorAudioTypes, type TutorAudioType, type TutorHistory, type TutorProfile } from "@shared/tutor";

type Message = TutorHistory & {
  id: number; source?: "local"|"ai"; audioBase64?: string|null; voiceStatus?: "ready"|"unavailable"|"off";
};
type Capture = { recorder: MediaRecorder; stream: MediaStream; timer?: ReturnType<typeof setTimeout>; chunks: Blob[]; size:number; send:boolean };
const MAX_MESSAGES = 24;

export default function TutorChat({profile}: {profile:TutorProfile}) {
  const [open,setOpen] = useState(true);
  const [messages,setMessages] = useState<Message[]>(()=>[{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
  const [consent,setConsent] = useState(false);
  const [voice,setVoice] = useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [privacyPrompt,setPrivacyPrompt]=useState(false);
  const [localVoices,setLocalVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI,setSelectedVoiceURI]=useState("");
  const [speechRate,setSpeechRate]=useState(0.95);
  const [speechPitch,setSpeechPitch]=useState(1);
  const [speakingId,setSpeakingId]=useState<number|null>(null);
  const currentSpeech=useRef<SpeechSynthesisUtterance|null>(null);
  const [draft,setDraft] = useState("");
  const [busy,setBusy] = useState(false);
  const [recording,setRecording] = useState(false);
  const [permissionPending,setPermissionPending] = useState(false);
  const [notice,setNotice] = useState("");
  const [transcriptReady,setTranscriptReady] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const capture = useRef<Capture|null>(null);
  const held = useRef(false);
  const generation = useRef(0);
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const capabilities = trpc.tutor.capabilities.useQuery(undefined,{retry:false,refetchOnWindowFocus:false});
  const reply = trpc.tutor.reply.useMutation();
  const transcribe = trpc.tutor.transcribe.useMutation();
  const welcome = trpc.tutor.welcomeAudio.useMutation();
  const enabled = capabilities.data?.chat === true;
  const provider=capabilities.data?.provider;
  const gemini = trpc.tutor.geminiDemo.useMutation();
  const [demo,setDemo] = useState<{text:string;audioBase64:string;audioMime:string}|null>(null);
  const [demoConsent,setDemoConsent]=useState(false);
  const previousProvider=useRef(provider);
  const localVoice=selectLocalVoice(localVoices,selectedVoiceURI);
  useEffect(()=>{
    if(typeof window.speechSynthesis==="undefined")return;
    const synth=window.speechSynthesis;
    const refresh=()=>setLocalVoices(synth.getVoices());
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[]);
  useEffect(()=>{if(previousProvider.current!==provider){previousProvider.current=provider;setConsent(false);setVoice(false);setDemoConsent(false);setDemo(null);setPrivacyPrompt(false);setMessages(previous=>previous.map(m=>({...m,audioBase64:null})));}},[provider]);

  function stopCapture(send:boolean) {
    held.current=false;
    const current=capture.current;
    if(!current) { generation.current++; setPermissionPending(false);return; }
    current.send=send;
    if(current.timer)clearTimeout(current.timer);
    if(current.recorder.state!=="inactive")current.recorder.stop();
    current.stream.getTracks().forEach(t=>t.stop());
    setRecording(false);
  }
  useEffect(()=>{
    mounted.current=true;
    return ()=>{
      mounted.current=false;
      if(typeof window.speechSynthesis!=="undefined")window.speechSynthesis.cancel();
      currentSpeech.current=null;
      generation.current++;
      held.current=false;
      const current=capture.current;
      if(current){
        current.send=false;
        if(current.timer)clearTimeout(current.timer);
        if(current.recorder.state!=="inactive")current.recorder.stop();
        current.stream.getTracks().forEach(t=>t.stop());
      }
    };
  },[]);
  useEffect(()=>{if(open)scrollAnchor.current?.scrollIntoView({block:"nearest"});},[open,messages.length]);

  function append(message:Omit<Message,"id">){
    const entry={...message,id:++sequence.current};
    setMessages(previous=>[...previous,entry].slice(-MAX_MESSAGES).map((m,i,all)=>
      i<all.length-8 ? {...m,audioBase64:null} : m));
  }
  async function submitMessage(authorized:boolean){
    const text=draft.trim();
    if(!text||inFlight.current||capture.current||held.current)return;
    inFlight.current=true;setBusy(true);setNotice("");setTranscriptReady(false);
    setDraft("");
    const history=messages.slice(-TUTOR_MAX_HISTORY).map(({role,text})=>({role,text}));
    append({role:"user",text});
    try{
      const res=await reply.mutateAsync({message:text,history,consent:authorized,provider,voice:authorized&&voice});
      if(!mounted.current)return;
      append({role:"assistant",text:res.text,source:res.source,audioBase64:res.audioBase64,voiceStatus:res.voiceStatus});
    }catch{
      if(mounted.current){setNotice("Não foi possível obter resposta. Seu texto permanece na conversa; tente novamente.");setDraft(text);}
    }finally{
      inFlight.current=false;if(mounted.current)setBusy(false);
    }
  }
  function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.trim()||busy||inFlight.current)return;
    if(enabled&&!consent){setPrivacyPrompt(true);return;}
    void submitMessage(consent);
  }
  function acceptPrivacy(){
    if(!enabled)return;
    setConsent(true);setPrivacyPrompt(false);
    if(draft.trim())void submitMessage(true);
    else setNotice("Pode falar! Para gravar, segure o microfone.");
  }
  async function speakWelcome(){
    if(inFlight.current||!consent||!capabilities.data?.tts)return;
    inFlight.current=true;setBusy(true);setNotice("");
    try{
      const res=await welcome.mutateAsync({consent:true,provider});
      if(!mounted.current)return;
      setMessages(previous=>previous.map(m=>m.id===0?{...m,text:res.text??m.text,audioBase64:res.audioBase64,voiceStatus:res.voiceStatus}:m));
      if(!res.audioBase64)setNotice("Voz indisponível; a mensagem de boas-vindas continua em texto.");
    }catch{if(mounted.current)setNotice("Voz indisponível. Você ainda pode conversar por texto.");}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  function stopSpeech(){
    currentSpeech.current=null;
    if(typeof window.speechSynthesis!=="undefined")window.speechSynthesis.cancel();
    setSpeakingId(null);
  }
  function browserSpeak(text:string,id:number){
    if(typeof window.speechSynthesis==="undefined"||typeof SpeechSynthesisUtterance==="undefined"||!localVoice){
      setNotice("Nenhuma voz local está disponível. Abra as configurações do tutor.");return;
    }
    if(speakingId===id){stopSpeech();return;}
    stopSpeech();
    const synth=window.speechSynthesis;
    const utterance=new SpeechSynthesisUtterance(speechText(text));
    const selected=localVoices.find(v=>v.voiceURI===localVoice.voiceURI);
    if(!selected)return;
    utterance.voice=selected;utterance.lang=selected.lang;
    utterance.rate=speechRate;utterance.pitch=speechPitch;
    utterance.onend=()=>{if(currentSpeech.current===utterance){currentSpeech.current=null;setSpeakingId(null);}};
    utterance.onerror=(e)=>{if(currentSpeech.current===utterance){currentSpeech.current=null;setSpeakingId(null);if(e.error!=="canceled"&&e.error!=="interrupted")setNotice("Não foi possível reproduzir a voz local. O texto continua disponível.");}};
    currentSpeech.current=utterance;setSpeakingId(id);setNotice("");synth.speak(utterance);
  }
  async function playGeminiDemo(){
    if(inFlight.current||!demoConsent||!capabilities.data?.geminiDemo)return;
    inFlight.current=true;setBusy(true);setNotice("");
    try {const res=await gemini.mutateAsync({consent:true,phraseIndex:1});if(mounted.current)setDemo(res);}
    catch{if(mounted.current)setNotice("Voz Gemini indisponível. O chat e a voz local continuam separados.");}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  async function startCapture(){
    if(!consent&&enabled){setPrivacyPrompt(true);return;}
    if(inFlight.current||capture.current||held.current||!consent||!capabilities.data?.asr)return;
    if(draft.trim()){setNotice("Envie ou apague o texto antes de gravar.");return;}
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setNotice("Este navegador não permite gravação. Use o teclado.");return;
    }
    held.current=true;setPermissionPending(true);setNotice("");
    const attempt=++generation.current;
    let stream:MediaStream|undefined;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current||!held.current||attempt!==generation.current){
        stream.getTracks().forEach(t=>t.stop());return;
      }
      const mime=tutorAudioTypes.find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime)throw new Error("Formato não suportado");
      const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32_000});
      const current:Capture={recorder,stream,chunks:[],size:0,send:false};
      capture.current=current;
      recorder.ondataavailable=(event)=>{
        if(event.data.size){current.chunks.push(event.data);current.size+=event.data.size;}
        if(current.size>TUTOR_MAX_AUDIO_BYTES){stopCapture(false);if(mounted.current)setNotice("Áudio excedeu o limite.");}
      };
      recorder.onstop=async()=>{
        capture.current=null;
        current.stream.getTracks().forEach(t=>t.stop());
        if(!mounted.current||!current.send||!current.size||current.size>TUTOR_MAX_AUDIO_BYTES)return;
        const blob=new Blob(current.chunks,{type:mime});
        inFlight.current=true;setBusy(true);
        try{
          const base64=await new Promise<string>((resolve,reject)=>{
            const reader=new FileReader();
            reader.onerror=()=>reject(new Error("Falha de leitura"));
            reader.onload=()=>resolve(String(reader.result).split(",")[1]??"");
            reader.readAsDataURL(blob);
          });
          if(!mounted.current)return;
          const result=await transcribe.mutateAsync({consent:true,provider,audio:{mime:mime as TutorAudioType,base64}});
          if(mounted.current){
            setDraft(result.text);setTranscriptReady(true);
            setNotice("Confira a transcrição e envie quando estiver correta. Ela não é uma nota de pronúncia.");
          }
        }catch(error){if(mounted.current)setNotice((error as {data?:{code?:string}})?.data?.code==="TOO_MANY_REQUESTS"?"O tutor está descansando. Tente novamente em alguns minutos.":"Não foi possível transcrever. Tente novamente ou digite.");}
        finally{inFlight.current=false;if(mounted.current)setBusy(false);}
      };
      recorder.onerror=()=>{stopCapture(false);if(mounted.current)setNotice("Falha na gravação. Use o teclado.");};
      recorder.start(250);
      current.timer=setTimeout(()=>stopCapture(true),TUTOR_MAX_RECORD_MS);
      setRecording(true);
    }catch{
      stream?.getTracks().forEach(t=>t.stop());capture.current=null;held.current=false;
      if(mounted.current)setNotice("Não foi possível acessar o microfone. Verifique a permissão ou digite.");
    }finally{if(mounted.current&&attempt===generation.current)setPermissionPending(false);}
  }
  function pointerStart(event:PointerEvent<HTMLButtonElement>){
    if(event.button!==0)return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    void startCapture();
  }
  function minimize(){stopCapture(false);stopSpeech();setSettingsOpen(false);setPrivacyPrompt(false);setOpen(false);}
  function updateConsent(next:boolean){
    if(!next){stopCapture(false);setVoice(false);setTranscriptReady(false);setDraft("");
      setMessages(previous=>previous.map(m=>({...m,audioBase64:null}))); }
    setConsent(next);
  }

  if(!open)return <button type="button" onClick={()=>setOpen(true)} aria-label={"Conversar com "+profile.tutorName}
    className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-4 text-white shadow-lg">
    <MessageCircle size={21}/><Mic size={15}/><span className="max-w-40 truncate text-sm font-semibold">{profile.tutorName}</span>
  </button>;

  return <aside aria-label={"Chat com "+profile.tutorName}
    className="fixed bottom-3 right-3 z-40 flex h-[min(640px,calc(100dvh-24px))] max-h-[85vh] w-[calc(100%-24px)] flex-col overflow-hidden rounded-2xl border border-ink/15 bg-white text-ink shadow-2xl sm:bottom-5 sm:right-5 sm:w-[420px]">
    <header className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
      <div className="min-w-0"><p className="truncate font-semibold">{profile.tutorName}</p><p className="text-xs text-white/75">Seu tutor de inglês · IA</p></div>
      <button type="button" onClick={minimize} aria-label="Minimizar tutor" className="rounded p-2 hover:bg-white/10"><Minus size={20}/></button>
    </header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
      {messages.map(m=><div key={m.id} className={m.role==="user"?"flex justify-end":"flex justify-start"}>
        <div className={m.role==="user"?"max-w-[88%] rounded-2xl bg-ink px-4 py-3 text-sm text-white":"max-w-[95%] rounded-2xl bg-paper px-4 py-3 text-sm"}>
          <p className="whitespace-pre-wrap break-words leading-6">{m.text}</p>
          {m.source==="local"&&<p className="mt-2 text-[10px] text-ink-muted">Mensagem guiada local</p>}
          {m.role==="assistant"&&m.audioBase64&&<audio className="mt-2 w-full" controls preload="none" src={"data:audio/mpeg;base64,"+m.audioBase64}/>}
          {m.role==="assistant"&&!m.audioBase64&&<div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-teal"><button type="button" disabled={recording||permissionPending} onClick={()=>browserSpeak(m.text,"pt-BR")}>Ouvir local PT</button><button type="button" disabled={recording||permissionPending} onClick={()=>browserSpeak(m.text,"en-US")}>Ouvir local EN</button></div>}
          {m.voiceStatus==="unavailable"&&<p className="mt-2 text-xs text-ink-muted">Voz indisponível · texto preservado</p>}
          {m.id===0&&!m.audioBase64&&consent&&capabilities.data?.tts&&<button type="button" disabled={busy||recording||permissionPending} onClick={()=>void speakWelcome()} className="mt-2 flex items-center gap-2 text-xs font-semibold text-teal"><Volume2 size={15}/> Preparar áudio das boas-vindas</button>}
        </div>
      </div>)}
      {busy&&<p className="text-xs text-ink-muted">Processando…</p>}
      <div ref={scrollAnchor}/>
    </div>
    <div className="shrink-0 space-y-2 border-t border-ink/10 p-3">
      {!enabled&&<p className="text-xs text-ink-muted">IA externa indisponível nesta conta. Você pode continuar com sugestões locais.</p>}
      <label className="flex items-start gap-2 text-xs leading-4">
        <input type="checkbox" disabled={busy||recording||permissionPending} checked={consent} onChange={e=>updateConsent(e.target.checked)}/>
        <span>Autorizo enviar o texto, histórico recente, perfil pedagógico e gravações que eu decidir enviar {provider==="groq"?"ao Groq":provider==="openai"?"à OpenAI":"ao provedor indicado (ainda indisponível)"} nesta sessão. Não inclua dados sensíveis.</span>
      </label>
      {provider==="openai"&&<label className="flex items-center gap-2 text-xs">
        <input type="checkbox" disabled={!consent||!capabilities.data?.tts||busy||recording||permissionPending} checked={voice} onChange={e=>{const next=e.target.checked;setVoice(next);if(next&&messages.some(m=>m.id===0&&!m.audioBase64))void speakWelcome();}}/>
        Receber respostas em voz artificial
      </label>}
      {provider==="groq"&&capabilities.data?.geminiDemo&&<details className="text-xs"><summary className="cursor-pointer font-semibold text-teal">Testar voz Gemini (frase fictícia)</summary><p className="mt-2 leading-4">Somente teste adulto de homologação. O Google pode usar o conteúdo gratuito para melhorar produtos. Nenhuma conversa, perfil ou gravação será enviada ao Gemini.</p><label className="mt-2 flex gap-2"><input type="checkbox" checked={demoConsent} disabled={busy} onChange={e=>{setDemoConsent(e.target.checked);if(!e.target.checked)setDemo(null);}}/>Autorizo enviar a frase fixa de teste ao Google.</label><button type="button" disabled={!demoConsent||busy||recording||permissionPending} onClick={()=>void playGeminiDemo()} className="mt-2 text-teal underline disabled:opacity-40">Gerar áudio de teste</button>{demo&&<div className="mt-2"><p>{demo.text}</p><audio controls preload="none" className="w-full" src={"data:"+demo.audioMime+";base64,"+demo.audioBase64}/></div>}</details>}
      {provider==="groq"&&<p className="text-[10px] text-ink-muted">A voz local depende das vozes instaladas no dispositivo. PT/EN escolhe o idioma de leitura, não uma avaliação de pronúncia.</p>}
      {notice&&<p role="status" className="text-xs leading-4 text-ink-muted">{notice}</p>}
      {transcriptReady&&<p className="text-xs font-semibold text-teal">Transcrição para conferir antes de enviar.</p>}
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea aria-label="Sua mensagem" rows={2} maxLength={TUTOR_MAX_TEXT} value={draft}
          onChange={e=>setDraft(e.target.value)} disabled={busy||recording||permissionPending}
          placeholder="Pergunte ou pratique em inglês..." className="min-w-0 flex-1 resize-none rounded-xl border border-ink/20 p-2 text-sm"/>
        <button type="button" aria-label={recording?"Soltar para transcrever":"Segure para falar; teclado: ativar e parar"}
          disabled={!consent||!capabilities.data?.asr||busy}
          onPointerDown={pointerStart} onPointerUp={()=>stopCapture(true)} onPointerCancel={()=>stopCapture(false)}
          onLostPointerCapture={()=>{if(held.current)stopCapture(false);}}
          onClick={e=>{if(e.detail===0){if(held.current)stopCapture(true);else void startCapture();}}}
          className={"touch-none rounded-full p-3 text-white disabled:opacity-35 "+(recording?"bg-red-700":"bg-ink")}>
          {recording?<Square size={19}/>:<Mic size={19}/>}
        </button>
        <button type="submit" disabled={busy||recording||permissionPending||!draft.trim()} aria-label="Enviar mensagem" className="rounded-full bg-ink p-3 text-white disabled:opacity-35"><Send size={18}/></button>
      </form>
      <p className="text-[10px] text-ink-muted">{recording?"Gravando · solte para transcrever (máx. 20 s)":permissionPending?"Aguardando permissão do microfone":"Segure o microfone para falar. Histórico apenas nesta sessão de tela."}</p>
    </div>
  </aside>;
}
