import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { MessageCircle, Mic, Minus, Send, Square, Volume2, Settings2, ChevronLeft } from "lucide-react";
import {availableLocalVoices,selectLocalVoice,speechText} from "@/lib/tutor-speech";
import {englishExcerpt} from "@/lib/english-example";
import {conversationStorageKeys,loadChatMemory,saveChatMemory,enableChatMemory,clearChatMemory} from "@/lib/tutor-memory";
import { trpc } from "@/lib/trpc";
import { greeting, TUTOR_MAX_AUDIO_BYTES, TUTOR_MAX_HISTORY, TUTOR_MAX_RECORD_MS,
  TUTOR_MAX_TEXT, tutorAudioTypes, type TutorAudioType, type TutorHistory, type TutorProfile } from "@shared/tutor";

type Message = TutorHistory & {
  id: number; source?: "local"|"ai"; audioBase64?: string|null; voiceStatus?: "ready"|"unavailable"|"off";
};
type Capture = { recorder: MediaRecorder; stream: MediaStream; timer?: ReturnType<typeof setTimeout>; chunks: Blob[]; size:number; send:boolean };
const MAX_MESSAGES = 24;

export type TutorVoiceSettings={voiceURI:string;rate:number;pitch:number;neuralVoice?:"troy"|"daniel"|"austin"|"autumn"|"diana"|"hannah"};
export default function TutorChat({profile,accountEmail,voiceSettings,onVoiceSettingsChange,onOpenTutorSettings,placementRequested,onPlacementCompleted}: {
  profile:TutorProfile;
  accountEmail:string;
  voiceSettings:TutorVoiceSettings;
  onVoiceSettingsChange:(prefs:TutorVoiceSettings)=>void;
  onOpenTutorSettings:()=>void;
  placementRequested:boolean;
  onPlacementCompleted:()=>void;
}) {
  const [open,setOpen] = useState(true);
  const [messages,setMessages] = useState<Message[]>(()=>[{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
  const [consent,setConsent] = useState(false);
  const [termsAccepted,setTermsAccepted] = useState(false);
  const [voice,setVoice] = useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [privacyPrompt,setPrivacyPrompt]=useState(false);
  const [localVoices,setLocalVoices]=useState<SpeechSynthesisVoice[]>([]);
  const {voiceURI:selectedVoiceURI,rate:speechRate,pitch:speechPitch}=voiceSettings;
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
  const memoryList=trpc.memory.list.useQuery(undefined,{enabled:capabilities.data?.longTermMemory===true,retry:false,refetchOnWindowFocus:false});
  const confirmMemory=trpc.memory.confirm.useMutation();
  const deleteMemory=trpc.memory.delete.useMutation();
  const clearMemories=trpc.memory.clear.useMutation();
  const [pendingMemory,setPendingMemory]=useState<{fato:string;categoria:string;token:string}|null>(null);
  const [memoryNotice,setMemoryNotice]=useState("");
  const transcribe = trpc.tutor.transcribe.useMutation();
  const welcome = trpc.tutor.welcomeAudio.useMutation();
  const placement=trpc.placement.me.useQuery(undefined,{retry:false,refetchOnWindowFocus:false});
  const placementSubmit=trpc.placement.submit.useMutation();
  const placementGenerate=trpc.placement.generate.useMutation();
  const [placementActive,setPlacementActive]=useState(false);
  const enabled = capabilities.data?.chat === true;
  const provider=capabilities.data?.provider;
  const gemini = trpc.tutor.geminiDemo.useMutation();
  const neural = trpc.tutor.neuralEnglish.useMutation();
  const [neuralAudios,setNeuralAudios]=useState<Record<number,string>>({});
  const [previewVoiceAudio,setPreviewVoiceAudio]=useState<string|null>(null);
  const [previewVoiceNotice,setPreviewVoiceNotice]=useState("");
  const [memoryChoice,setMemoryChoice]=useState<{scope:string;enabled:boolean}>({scope:"",enabled:false});
  const [demo,setDemo] = useState<{text:string;audioBase64:string;audioMime:string}|null>(null);
  const [demoConsent,setDemoConsent]=useState(false);
  const previousConsentKey=useRef<string|null>(null);
  const consentKey=provider&&provider!=="off"?`lingua:provider-consent:v1:${accountEmail.trim().toLowerCase()}:${provider}`:null;
  const localVoice=selectLocalVoice(localVoices,selectedVoiceURI);
  const memoryKeys=provider&&provider!=="off"?conversationStorageKeys(accountEmail,provider):null;
  const memoryScope=memoryKeys?.conversation??"";
  useEffect(()=>{
    if(typeof window.speechSynthesis==="undefined")return;
    const synth=window.speechSynthesis;
    const refresh=()=>setLocalVoices(synth.getVoices());
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[]);
  useEffect(()=>{
    if(previousConsentKey.current===consentKey)return;
    previousConsentKey.current=consentKey;
    let accepted=false;
    if(consentKey){try{
      const stored=JSON.parse(window.localStorage.getItem(consentKey)??"null") as {accepted?:boolean;version?:number}|null;
      accepted=stored?.accepted===true&&stored?.version===1;
    }catch{/* Storage blocked: ask once in memory only. */}}
    setConsent(accepted);setTermsAccepted(false);setVoice(false);setDemoConsent(false);setDemo(null);setPrivacyPrompt(false);
    setMessages(previous=>previous.map(m=>({...m,audioBase64:null})));
  },[provider,consentKey]);

  // Local history is optional, account-scoped and never includes audio.
  useEffect(()=>{
    if(!memoryKeys)return;
    const saved=loadChatMemory(window.localStorage,memoryKeys);
    const restored:Message[]=[{id:0,role:"assistant",text:greeting(profile),source:"local"},...saved.messages];
    sequence.current=Math.max(0,...saved.messages.map(x=>x.id));
    setMessages(restored);setNeuralAudios({});
    setMemoryChoice({scope:memoryScope,enabled:saved.enabled});
  },[memoryScope]);
  useEffect(()=>{
    if(!memoryKeys||memoryChoice.scope!==memoryScope||!memoryChoice.enabled)return;
    saveChatMemory(window.localStorage,memoryKeys,messages.filter(m=>m.id>0).map(({id,role,text,source})=>({id,role,text,source})));
  },[messages,memoryChoice,memoryScope]);
  function setMemoryEnabled(enabled:boolean){
    if(!memoryKeys)return;
    if(enabled){
      if(!enableChatMemory(window.localStorage,memoryKeys)){setNotice("Este navegador não permite salvar o histórico local.");return;}
      saveChatMemory(window.localStorage,memoryKeys,messages.filter(m=>m.id>0).map(({id,role,text,source})=>({id,role,text,source})));
    }else clearChatMemory(window.localStorage,memoryKeys,true);
    setMemoryChoice({scope:memoryScope,enabled});
  }
  async function acceptMemory(){
    if(!pendingMemory||confirmMemory.isPending)return;
    setMemoryNotice("");
    try{
      await confirmMemory.mutateAsync({token:pendingMemory.token,accepted:true});
      setPendingMemory(null);
      setMemoryNotice("Lembrança guardada na sua conta. Você pode apagá-la nas configurações.");
      await memoryList.refetch();
    }catch{
      setPendingMemory(null);
      setMemoryNotice("A autorização expirou ou a memória está indisponível. Nenhum fato foi salvo.");
    }
  }
  async function removeMemory(id:number){
    try{
      await deleteMemory.mutateAsync({id});
      await memoryList.refetch();
      setMemoryNotice("Lembrança apagada da sua conta.");
    }catch{setMemoryNotice("Não foi possível apagar esta lembrança agora.");}
  }
  async function eraseAllMemories(){
    if(!window.confirm("Apagar todas as lembranças de longo prazo da sua conta? Isso não apaga o histórico local."))return;
    try{
      await clearMemories.mutateAsync();
      setPendingMemory(null);
      await memoryList.refetch();
      setMemoryNotice("Todas as lembranças confirmadas foram apagadas.");
    }catch{setMemoryNotice("Não foi possível apagar as lembranças agora.");}
  }
  function eraseConversation(){
    if(memoryKeys)clearChatMemory(window.localStorage,memoryKeys);
    setMessages([{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
    sequence.current=0;setNeuralAudios({});setPreviewVoiceAudio(null);setNotice("Histórico apagado neste dispositivo.");
  }

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
  function beginPlacement(){
    if(placementActive||!placement.data?.nextTask||busy)return;
    setOpen(true);setSettingsOpen(false);setPlacementActive(true);
    setNotice("A sondagem inicial é opcional. Não produz nível CEFR; escuta, leitura e fala exigem outras tarefas.");
    append({role:"assistant",text:placement.data.nextTask.prompt});
  }
  useEffect(()=>{
    if(placementRequested&&placement.data&&!placementActive&&placement.data.nextTask){
      beginPlacement();
    }
  },[placementRequested,placement.data,placementActive]);
  async function buildPlan(){
    if(!consent){setTermsAccepted(false);setPrivacyPrompt(true);return;}
    if(!placementActive||placement.data?.nextTask||busy)return;
    inFlight.current=true;setBusy(true);setNotice("");
    try{
      const res=await placementGenerate.mutateAsync({consent:true});
      if(!mounted.current)return;
      await placement.refetch();
      append({role:"assistant",text:"Seu plano de quatro semanas foi salvo como sugestão provisória, sem classificação CEFR. Acesse Meu início para conferir as atividades e as habilidades ainda não avaliadas."});
      if(res.source==="rule_based")setNotice("A IA não conseguiu gerar sugestões. Foi salvo um plano básico transparente, que pode ser revisto.");
      setPlacementActive(false);onPlacementCompleted();
    }catch{if(mounted.current)setNotice("Não foi possível gerar ou salvar o plano agora. Suas três respostas continuam registradas.");}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  async function submitMessage(authorized:boolean){
    const text=draft.trim();
    if(!text||inFlight.current||capture.current||held.current)return;
    if(placementActive&&text.length>800){setNotice("Nesta sondagem, use até 800 caracteres por resposta.");return;}
    const isPlacement=placementActive&&Boolean(placement.data?.nextTask);
    setPendingMemory(null);
    const viaASR=transcriptReady;
    inFlight.current=true;setBusy(true);setNotice("");setTranscriptReady(false);
    setDraft("");
    const history=messages.slice(-TUTOR_MAX_HISTORY).map(({role,text})=>({role,text}));
    append({role:"user",text});
    try{
      if(isPlacement&&placement.data?.nextTask){
        await placementSubmit.mutateAsync({consent:true,taskId:placement.data.nextTask.id,
          answer:text,modality:viaASR?"asr_text":"text"});
        if(!mounted.current)return;
        const next=await placement.refetch();
        if(next.data?.nextTask)append({role:"assistant",text:next.data.nextTask.prompt});
        else append({role:"assistant",text:"Obrigado! Agora temos três amostras de texto. Elas não bastam para atribuir um nível, mas podemos criar um plano inicial de quatro semanas. Clique em Gerar plano provisório."});
      }else{
        const res=await reply.mutateAsync({message:text,history,consent:authorized,provider,voice:authorized&&voice});
        if(!mounted.current)return;
        append({role:"assistant",text:res.text,source:res.source,audioBase64:res.audioBase64,voiceStatus:res.voiceStatus});
        if(capabilities.data?.longTermMemory&&res.memoryProposal)setPendingMemory(res.memoryProposal);
      }
    }catch{
      if(mounted.current){setNotice("Não foi possível obter resposta. Seu texto permanece na conversa; tente novamente.");setDraft(text);}
    }finally{
      inFlight.current=false;if(mounted.current)setBusy(false);
    }
  }
  function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.trim()||busy||inFlight.current)return;
    if(enabled&&!consent){setTermsAccepted(false);setPrivacyPrompt(true);return;}
    void submitMessage(consent);
  }
  function acceptPrivacy(){
    if(!enabled||!termsAccepted)return;
    setConsent(true);setPrivacyPrompt(false);setTermsAccepted(false);
    if(consentKey)try{window.localStorage.setItem(consentKey,JSON.stringify({version:1,accepted:true,agreedAt:new Date().toISOString()}));}catch{/* Consent still valid in this tab. */}

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
  async function playNeural(message:Message){
    if(!consent||!enabled||!capabilities.data?.neuralEnglish)return;
    const phrase=englishExcerpt(message.text);
    if(!phrase){setNotice("Ainda não há uma frase em inglês identificável nesta resposta.");return;}
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setNotice("");
    try{
      const result=await neural.mutateAsync({consent:true,provider:"groq",voice:voiceSettings.neuralVoice??"troy",text:phrase});
      if(mounted.current)setNeuralAudios(old=>({...old,[message.id]:result.audioBase64}));
    }catch{
      if(mounted.current)setNotice("A voz neural está indisponível ou atingiu a cota. O texto permanece; a voz local é opcional nas configurações.");
    }finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  async function previewNeuralVoice(){
    if(inFlight.current)return;
    if(!consent){setSettingsOpen(false);setPrivacyPrompt(true);return;}
    if(!enabled||!capabilities.data?.neuralEnglish){setPreviewVoiceNotice("Voz neural não habilitada nesta conta.");return;}
    inFlight.current=true;setBusy(true);setPreviewVoiceNotice("");setPreviewVoiceAudio(null);
    try{
      const result=await neural.mutateAsync({consent:true,provider:"groq",voice:voiceSettings.neuralVoice??"troy",
        text:"Hello! I am your English tutor. Let us practice together."});
      if(mounted.current)setPreviewVoiceAudio(result.audioBase64);
    }catch(error){
      if(mounted.current){
        const message=(error as {message?:unknown})?.message;
        const diagnosed=typeof message==="string"&&message.startsWith("Groq recusou a voz neural (HTTP 400):")&&message.length<=180;
        setPreviewVoiceNotice((error as {data?:{code?:string}})?.data?.code==="TOO_MANY_REQUESTS"?
          "Limite gratuito de voz atingido. Aguarde a renovação da cota.":
          diagnosed?message:"Erro na voz neural Groq. Nenhum fallback de áudio externo foi acionado.");
      }
    }finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  async function playGeminiDemo(){
    if(inFlight.current||!demoConsent||!capabilities.data?.geminiDemo)return;
    inFlight.current=true;setBusy(true);setNotice("");
    try {const res=await gemini.mutateAsync({consent:true,phraseIndex:1});if(mounted.current)setDemo(res);}
    catch{if(mounted.current)setNotice("Voz Gemini indisponível. O chat e a voz local continuam separados.");}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  async function startCapture(){
    if(!consent&&enabled){setTermsAccepted(false);setPrivacyPrompt(true);return;}
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
    if(!next){if(consentKey)try{window.localStorage.removeItem(consentKey);}catch{/* no local storage */}
      stopSpeech();stopCapture(false);setVoice(false);setTranscriptReady(false);setDraft("");
      setMessages(previous=>previous.map(m=>({...m,audioBase64:null})));setNeuralAudios({});setPendingMemory(null); }
    setConsent(next);
  }

  if(!open)return <button type="button" onClick={()=>setOpen(true)} aria-label={"Conversar com "+profile.tutorName}
    className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-4 text-white shadow-lg">
    <MessageCircle size={21}/><Mic size={15}/><span className="max-w-40 truncate text-sm font-semibold">{profile.tutorName}</span>
  </button>;

  return <aside aria-label={"Chat com "+profile.tutorName}
    className="fixed inset-0 z-40 flex h-[100dvh] w-screen flex-col overflow-hidden bg-white text-ink shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(720px,calc(100dvh-40px))] sm:w-[min(620px,calc(100vw-40px))] sm:rounded-2xl sm:border sm:border-ink/15">
    <header className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
      <div className="min-w-0"><p className="truncate font-semibold">{profile.tutorName}</p><p className="text-xs text-white/75">Converse e pratique inglês</p></div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={()=>{stopSpeech();setPrivacyPrompt(false);setSettingsOpen(p=>!p);}}
          aria-label={settingsOpen?"Voltar à conversa":"Configurações de conversa e voz"}
          title="Configurações" className="rounded-lg p-2 hover:bg-white/10">
          {settingsOpen?<ChevronLeft size={20}/>:<Settings2 size={20}/>}
        </button>
        <button type="button" onClick={minimize} aria-label="Minimizar tutor" className="rounded-lg p-2 hover:bg-white/10"><Minus size={20}/></button>
      </div>
    </header>
    {privacyPrompt ? <section role="dialog" aria-label="Autorização da conversa" className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-y-auto p-6">
      <div>
        <h2 className="font-display text-2xl">Pronto para conversar?</h2>
        <p className="mt-3 text-sm leading-6">Para responder, {provider==="groq"?"o Groq":provider==="openai"?"a OpenAI":"um serviço externo"} processará sua mensagem, seu perfil de estudo, o histórico recente e as gravações que você decidir enviar. Não inclua informações sensíveis.</p>
        <p className="mt-3 text-xs leading-5 text-ink-muted">O aceite fica lembrado neste navegador para esta conta e este provedor. Você pode revogar em Configurações. Em outro dispositivo ou provedor, solicitaremos novamente. Nada será enviado antes da confirmação.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-1.5" /><span>Li e aceito que o serviço indicado processe minhas mensagens, perfil e áudios enviados, conforme descrito acima. Posso revogar em Configurações.</span></label>
        <button type="button" autoFocus disabled={!termsAccepted} onClick={acceptPrivacy} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{draft.trim()?"Aceitar e enviar":"Começar a conversar"}</button>
        <button type="button" onClick={()=>setPrivacyPrompt(false)} className="rounded-full border border-ink/20 px-5 py-3 text-sm font-semibold">Agora não</button>
      </div>
    </section> : settingsOpen ? <section aria-label="Preferências da conversa" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
      <div>
        <h2 className="font-display text-2xl">Configurações de voz</h2>
        <p className="mt-2 text-sm text-ink-muted">Escolha como as mensagens serão lidas neste dispositivo.</p>
      </div>
      <button type="button" onClick={()=>{stopSpeech();setSettingsOpen(false);setOpen(false);onOpenTutorSettings();}} className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold">Abrir Meu Tutor para escolher voz e personalidade</button>
      {provider==="groq"&&<div className="space-y-3 border-b border-ink/10 pb-5">
        <p className="text-sm font-semibold">Voz neural em inglês · Groq Orpheus</p>
        <p className="text-xs leading-5 text-ink-muted">Lê uma frase em inglês da resposta, até 200 caracteres. Pode consumir sua cota gratuita do Groq. Para explicações em português, continue usando texto.</p>
        <label className="block text-sm font-semibold">Voz neural
          <select value={voiceSettings.neuralVoice??"troy"} onChange={e=>{setPreviewVoiceAudio(null);setPreviewVoiceNotice("");onVoiceSettingsChange({...voiceSettings,neuralVoice:e.target.value as NonNullable<TutorVoiceSettings["neuralVoice"]>});}}
            className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal">
            {(["troy","daniel","austin","autumn","diana","hannah"] as const).map(id=><option key={id} value={id}>{id[0].toUpperCase()+id.slice(1)}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy||recording||permissionPending} onClick={()=>void previewNeuralVoice()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy?"Gerando prévia…":"Testar esta voz neural"}
        </button>
        {!consent&&<p className="text-xs text-ink-muted">A prévia requer autorização para enviar a frase fictícia ao Groq.</p>}
        {previewVoiceAudio&&<audio controls autoPlay preload="none" className="w-full" src={"data:audio/wav;base64,"+previewVoiceAudio}/>}
        {previewVoiceNotice&&<p role="status" className="text-xs text-ink-muted">{previewVoiceNotice}</p>}
      </div>}
      <div className="space-y-3">
        <label className="block text-sm font-semibold">Voz local de contingência
          <select aria-label="Selecionar voz de leitura" value={localVoice?.voiceURI??""} disabled={availableLocalVoices(localVoices).length===0}
            onChange={e=>{stopSpeech();onVoiceSettingsChange({...voiceSettings,voiceURI:e.target.value});}}
            className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal disabled:opacity-50">
            {availableLocalVoices(localVoices).length===0?<option value="">Nenhuma voz local disponível</option>:availableLocalVoices(localVoices).map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}
          </select>
        </label>
        {!localVoice&&<p role="status" className="text-sm text-ink-muted">Não há voz local disponível neste navegador. Você pode continuar por texto, ou experimentar um navegador/dispositivo com vozes instaladas.</p>}
        {localVoice&&<p className="text-xs text-ink-muted">Voz selecionada: {localVoice.lang}. A qualidade e os idiomas disponíveis dependem do seu dispositivo; uma mesma voz pode pronunciar incorretamente trechos de outro idioma.</p>}
        <label className="block text-sm font-semibold">Velocidade · {speechRate.toFixed(2)}×
          <input type="range" min="0.75" max="1.15" step="0.05" value={speechRate} onChange={e=>onVoiceSettingsChange({...voiceSettings,rate:Number(e.target.value)})} className="mt-2 w-full" />
        </label>
        <label className="block text-sm font-semibold">Altura da voz · {speechPitch.toFixed(2)}
          <input type="range" min="0.8" max="1.2" step="0.05" value={speechPitch} onChange={e=>onVoiceSettingsChange({...voiceSettings,pitch:Number(e.target.value)})} className="mt-2 w-full" />
        </label>
        <button type="button" disabled={!localVoice} onClick={()=>browserSpeak("Hello! Vamos praticar inglês.",-1)} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold disabled:opacity-40">
          <Volume2 size={16}/>{speakingId===-1?"Parar teste":"Testar voz"}
        </button>
      </div>
      <div className="border-t border-ink/10 pt-5 space-y-3">
        <h3 className="font-semibold">Histórico da conversa</h3>
        <label className="flex items-start gap-2 text-sm leading-5">
          <input type="checkbox" checked={memoryChoice.scope===memoryScope&&memoryChoice.enabled} onChange={e=>setMemoryEnabled(e.target.checked)} className="mt-1"/>
          Guardar mensagens de texto neste navegador por até 30 dias
        </label>
        <p className="text-xs leading-5 text-ink-muted">Opcional e por conta: recupera o chat após atualizar a página, somente neste navegador. Não salva gravações nem áudio neural, não sincroniza dispositivos e não é memória permanente do tutor. Evite dados sensíveis em dispositivos compartilhados.</p>
        <button type="button" onClick={eraseConversation} className="text-sm font-semibold text-red-700 underline">Apagar conversa neste aparelho</button>
      </div>
      {capabilities.data?.longTermMemory&&<div className="space-y-3 border-t border-ink/10 pt-5">
        <h3 className="font-semibold">Memórias de longo prazo · sua conta</h3>
        <p className="text-xs leading-5 text-ink-muted">Só fatos que você confirmou ficam salvos no Aiven e podem aparecer em outras sessões e dispositivos. São autodeclarações, não certificados, provas de domínio ou informações verificadas por terceiros. Isso é diferente do histórico local deste navegador.</p>
        {memoryList.isError&&<p role="status" className="text-xs text-ink-muted">Memórias indisponíveis neste momento. O chat continua funcionando.</p>}
        {memoryList.data?.length===0&&<p className="text-xs text-ink-muted">Nenhuma lembrança autorizada ainda.</p>}
        {memoryList.data?.map(m=><div key={m.id} className="rounded-lg border border-ink/10 p-3 text-sm">
          <p className="break-words">{m.fato}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-muted">Autodeclarado · {m.categoria}</span>
            <button type="button" disabled={deleteMemory.isPending||clearMemories.isPending}
              onClick={()=>void removeMemory(m.id)} className="text-xs font-semibold text-red-700 underline disabled:opacity-40">Apagar</button>
          </div>
        </div>)}
        {Boolean(memoryList.data?.length)&&<button type="button" disabled={clearMemories.isPending||deleteMemory.isPending}
          onClick={()=>void eraseAllMemories()} className="text-xs font-semibold text-red-700 underline disabled:opacity-40">Apagar todas as lembranças</button>}
        {memoryNotice&&<p role="status" className="text-xs text-ink-muted">{memoryNotice}</p>}
      </div>}
      <div className="border-t border-ink/10 pt-5">
        <h3 className="font-semibold">Privacidade da conversa</h3>
        <p className="mt-2 text-xs leading-5 text-ink-muted">Seu chat pode enviar texto e gravações ao {provider==="groq"?"Groq":provider==="openai"?"serviço OpenAI":"provedor externo"} somente após autorização. O aceite é lembrado apenas neste navegador, por conta e provedor, até você revogar ou limpar os dados locais. Não constitui registro de consentimento auditado no servidor.</p>
        {consent?<button type="button" onClick={()=>{updateConsent(false);setNotice("Envio à IA desativado nesta sessão.");}} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold">Desativar envio à IA</button>:
          <button type="button" disabled={!enabled} onClick={()=>{setSettingsOpen(false);setPrivacyPrompt(true);}} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold disabled:opacity-40">Autorizar envio à IA</button>}
      </div>
      {provider==="openai"&&<label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={voice} disabled={!consent||!capabilities.data?.tts||busy} onChange={e=>setVoice(e.target.checked)}/>
        Gerar áudio pelo serviço configurado
      </label>}
      {provider==="groq"&&capabilities.data?.geminiDemo&&<details className="border-t border-ink/10 pt-5 text-sm">
        <summary className="cursor-pointer font-semibold">Laboratório: teste de voz Gemini</summary>
        <p className="mt-3 text-xs leading-5 text-ink-muted">Apenas uma frase fictícia predefinida será enviada ao Google. Na modalidade gratuita, o Google pode usar o conteúdo para melhorar produtos. O histórico, nome e perfil do estudante não são enviados.</p>
        <label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" className="mt-1" checked={demoConsent} disabled={busy} onChange={e=>{setDemoConsent(e.target.checked);if(!e.target.checked)setDemo(null);}}/>Autorizo enviar a frase fictícia ao Google apenas para testar a voz.</label>
        <button type="button" disabled={!demoConsent||busy||recording||permissionPending} onClick={()=>void playGeminiDemo()} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold disabled:opacity-40">Gerar áudio de teste</button>
        {demo&&<div className="mt-3 space-y-2"><p className="text-xs">{demo.text}</p><audio controls preload="none" className="w-full" src={"data:"+demo.audioMime+";base64,"+demo.audioBase64}/></div>}
      </details>}
      <button type="button" onClick={()=>setSettingsOpen(false)} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Voltar à conversa</button>
    </section> : <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" role="log" aria-live="polite">
        {messages.map(m=><div key={m.id} className={m.role==="user"?"flex justify-end":"flex justify-start"}>
          <div className={m.role==="user"?"max-w-[86%] rounded-2xl bg-ink px-4 py-3 text-sm text-white":"max-w-[92%] rounded-2xl bg-paper px-4 py-3 text-sm"}>
            <p className="whitespace-pre-wrap break-words leading-6">{m.text}</p>
            {m.source==="local"&&<p className="mt-2 text-[11px] text-ink-muted">Resposta local · IA indisponível ou não autorizada</p>}
            {m.role==="assistant"&&m.audioBase64&&<audio className="mt-2 w-full" controls preload="none" src={"data:audio/mpeg;base64,"+m.audioBase64}/>}
            {m.role==="assistant"&&!m.audioBase64&&provider==="groq"&&consent&&capabilities.data?.neuralEnglish&&englishExcerpt(m.text)&&<div className="mt-2 space-y-2">
              {neuralAudios[m.id]?<audio controls preload="none" className="w-full" src={"data:audio/wav;base64,"+neuralAudios[m.id]}/>:
                <button type="button" disabled={busy||recording||permissionPending} onClick={()=>void playNeural(m)}
                  className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-teal hover:bg-ink/5 disabled:opacity-40">
                  <Volume2 size={14}/> Ouvir exemplo em inglês (voz neural)
                </button>}
            </div>}
            {m.role==="assistant"&&!m.audioBase64&&localVoice&&<button type="button" disabled={recording||permissionPending} onClick={()=>browserSpeak(m.text,m.id)}
              className="mt-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-teal hover:bg-ink/5 disabled:opacity-40" aria-label={(speakingId===m.id?"Parar áudio de ":"Ouvir mensagem de ")+profile.tutorName}>
              {speakingId===m.id?<Square size={14}/>:<Volume2 size={14}/>}
              {speakingId===m.id?"Parar":"Voz local (alternativa)"}
            </button>}
            {m.voiceStatus==="unavailable"&&<p className="mt-1 text-xs text-ink-muted">Áudio externo indisponível. Mensagem preservada.</p>}
            {m.id===0&&!m.audioBase64&&consent&&capabilities.data?.tts&&<button type="button" disabled={busy||recording||permissionPending} onClick={()=>void speakWelcome()} className="mt-2 flex items-center gap-2 text-xs font-semibold text-teal"><Volume2 size={15}/> Preparar áudio das boas-vindas</button>}
          </div>
        </div>)}
        {pendingMemory&&capabilities.data?.longTermMemory&&!placementActive&&<section aria-label="Autorizar uma lembrança" className="rounded-xl border border-teal/30 bg-paper p-4 text-sm">
          <p className="font-semibold">Posso guardar uma lembrança para personalizar suas próximas aulas?</p>
          <p className="mt-2 break-words leading-5">Você disse: “{pendingMemory.fato}”</p>
          <p className="mt-2 text-xs leading-5 text-ink-muted">Se autorizar, ela ficará salva na sua conta. É uma declaração sua, não uma comprovação externa. Você poderá apagá-la depois.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={confirmMemory.isPending||busy}
              onClick={()=>void acceptMemory()} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Guardar</button>
            <button type="button" disabled={confirmMemory.isPending}
              onClick={()=>{setPendingMemory(null);setMemoryNotice("Tudo bem. Essa informação não foi salva.");}}
              className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold">Agora não</button>
          </div>
        </section>}
        {memoryNotice&&!settingsOpen&&<p role="status" className="text-xs text-ink-muted">{memoryNotice}</p>}
        {busy&&<p className="text-xs text-ink-muted">Preparando resposta…</p>}
        <div ref={scrollAnchor}/>
      </div>
      <div className="shrink-0 space-y-2 border-t border-ink/10 bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {!placementActive&&placement.data?.nextTask&&<button type="button" disabled={busy||recording} onClick={beginPlacement}
          className="rounded-full border border-teal px-4 py-2 text-xs font-semibold text-teal">Quero descobrir por onde começar · 3 perguntas</button>}
        {placementActive&&<div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold">Sondagem de escrita · {placement.data?.answers.length??0}/3</span>
          {placement.data&&!placement.data.nextTask&&<button type="button" disabled={busy} onClick={()=>void buildPlan()} className="rounded-full bg-ink px-3 py-2 font-semibold text-white">Gerar plano provisório</button>}
          <button type="button" onClick={()=>{setPlacementActive(false);setNotice("Sondagem pausada. Suas respostas já enviadas foram salvas.");}} className="text-ink-muted underline">Sair da sondagem</button>
        </div>}
        {!enabled&&<p className="text-xs text-ink-muted">Conversa com IA temporariamente indisponível. Você pode continuar com sugestões locais.</p>}
        {memoryKeys&&memoryChoice.scope===memoryScope&&!memoryChoice.enabled&&<button type="button" className="text-left text-xs font-semibold text-teal underline" onClick={()=>setMemoryEnabled(true)}>Guardar esta conversa neste navegador (opcional)</button>}
        {memoryKeys&&memoryChoice.scope===memoryScope&&memoryChoice.enabled&&<p className="text-[10px] text-ink-muted">Histórico local ativado · até 30 dias · apagar nas configurações</p>}
        {notice&&<p role="status" className="text-xs leading-4 text-ink-muted">{notice}</p>}
        {transcriptReady&&<p className="text-xs font-semibold text-teal">Confira o texto reconhecido antes de enviar.</p>}
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea aria-label="Sua mensagem" rows={2} maxLength={TUTOR_MAX_TEXT} value={draft}
            onChange={e=>setDraft(e.target.value)} disabled={busy||recording||permissionPending}
            placeholder="Converse com seu tutor..." className="min-w-0 flex-1 resize-none rounded-xl border border-ink/20 p-3 text-sm"/>
          <button type="button" aria-label={recording?"Soltar para transcrever":"Segure para falar; teclado: ativar e parar"}
            disabled={!enabled||!capabilities.data?.asr||busy}
            onPointerDown={pointerStart} onPointerUp={()=>stopCapture(true)} onPointerCancel={()=>stopCapture(false)}
            onLostPointerCapture={()=>{if(held.current)stopCapture(false);}}
            onClick={e=>{if(e.detail===0){if(held.current)stopCapture(true);else void startCapture();}}}
            className={"touch-none rounded-full p-3 text-white disabled:opacity-35 "+(recording?"bg-red-700":"bg-ink")}>
            {recording?<Square size={19}/>:<Mic size={19}/>}
          </button>
          <button type="submit" disabled={busy||recording||permissionPending||!draft.trim()} aria-label="Enviar mensagem"
            className="rounded-full bg-ink p-3 text-white disabled:opacity-35"><Send size={18}/></button>
        </form>
        {recording&&<p className="text-xs text-ink-muted">Gravando… Solte o microfone para transcrever.</p>}
        {permissionPending&&<p className="text-xs text-ink-muted">Verifique a permissão do microfone no navegador.</p>}
      </div>
    </>}
  </aside>;
}
