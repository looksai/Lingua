import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { MessageCircle, Mic, Minus, Send, Square, Volume2, Settings2, ChevronLeft } from "lucide-react";
import {availableLocalVoices,selectEnglishLocalVoice,selectLocalVoice,speechText} from "@/lib/tutor-speech";
import {englishExcerpt} from "@/lib/english-example";
import {modalityForTutorReply,transcriptOriginAfterEdit} from "@shared/pedagogy/tutor-input-modality";
import {resolveTutorAudio} from "@shared/pedagogy/tutor-audio-action";
import {TutorAudioControls} from "@/components/TutorAudioControls";
import {TutorCatalogTaskView} from "@/components/TutorCatalogTaskView";
import {splitCatalogTaskText,type CatalogClientTask} from "@shared/pedagogy/cal-client-delivery";
import {tutorAsyncResultIsCurrent} from "@shared/pedagogy/tutor-async-epoch";
import {conversationStorageKeys,loadChatMemory,saveChatMemory,enableChatMemory,clearChatMemory} from "@/lib/tutor-memory";
import {
  clearStudyTopicBookmark,loadStudyTopicBookmark,saveStudyTopicBookmark,
  setStudyTopicBookmarkEnabled,studyTopicBookmarkKeys,studyTopicRestartRequest,
  type StudyTopicBookmark,
} from "@/lib/tutor-study-topic-bookmark";
import {getMicrocompetency,getMicrotask} from "@shared/pedagogy/microcompetency-catalog";
import { trpc } from "@/lib/trpc";
import { greeting, TUTOR_MAX_AUDIO_BYTES, TUTOR_MAX_HISTORY, TUTOR_MAX_RECORD_MS,
  TUTOR_MAX_TEXT, tutorAudioTypes, type TutorAudioType, type TutorHistory, type TutorProfile } from "@shared/tutor";

type Message = TutorHistory & {
  id: number; source?: "local"|"ai"; audioBase64?: string|null; voiceStatus?: "ready"|"unavailable"|"off";
  catalogTask?:CatalogClientTask|null;
};
type MemoryCandidate = { fato:string; categoria:"profissao"|"objetivo"|"interesse"|"preferencia_estudo"; sourceMessage:string };
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
  const [pendingMemory,setPendingMemory]=useState<MemoryCandidate|null>(null);
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
  const catalogRenderAck=trpc.tutor.catalogRenderAck.useMutation();
  const revokeCatalogConsent=trpc.tutor.revokeCatalogConsent.useMutation();
  const [revocationPending,setRevocationPending]=useState(false);
  const [revocationFailed,setRevocationFailed]=useState(false);
  const catalogPendingTask=trpc.tutor.catalogPendingTask.useMutation();
  const [recoveredCatalogTask,setRecoveredCatalogTask]=useState<CatalogClientTask|null>(null);
  const catalogRecoverySequence=useRef(0);
  const savedMemories=trpc.tutor.memoryList.useQuery(undefined,{enabled:capabilities.data?.memory===true,retry:false,refetchOnWindowFocus:false});
  const saveMemory=trpc.tutor.memorySave.useMutation();
  const deleteMemory=trpc.tutor.memoryDelete.useMutation();
  const clearMemories=trpc.tutor.memoryClear.useMutation();
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
  const [neuralFallback,setNeuralFallback]=useState<Record<number,boolean>>({});
  const [generatingId,setGeneratingId]=useState<number|null>(null);
  const [autoPlayId,setAutoPlayId]=useState<number|null>(null);
  const autoPlayRef=useRef<HTMLAudioElement|null>(null);
  const audioRoot=useRef<HTMLElement|null>(null);
  const conversationVersion=useRef(0);
  const isCurrent=(epoch:number)=>tutorAsyncResultIsCurrent(epoch,conversationVersion.current,mounted.current);
  const operationToken=useRef(0);
  function beginBusy():number {
    const op=++operationToken.current;
    inFlight.current=true;
    setBusy(true);
    return op;
  }
  function finishBusy(op:number):void {
    // A retired operation must never unlock a newer one.
    if(!tutorAsyncResultIsCurrent(op,operationToken.current,mounted.current))return;
    inFlight.current=false;
    setBusy(false);
    setGeneratingId(null);
  }
  function invalidateConversation():void {
    conversationVersion.current++;
    catalogRecoverySequence.current++;
    setRecoveredCatalogTask(null);
    // Unlock the new account while late results from the old operation are discarded.
    operationToken.current++;
    inFlight.current=false;
    if(mounted.current){setBusy(false);setGeneratingId(null);}
  }

  const [previewVoiceAudio,setPreviewVoiceAudio]=useState<string|null>(null);
  const [previewVoiceNotice,setPreviewVoiceNotice]=useState("");
  const [memoryChoice,setMemoryChoice]=useState<{scope:string;enabled:boolean}>({scope:"",enabled:false});
  const [topicChoice,setTopicChoice]=useState<{
    scope:string;enabled:boolean;bookmark:StudyTopicBookmark|null;
  }>({scope:"",enabled:false,bookmark:null});
  const [demo,setDemo] = useState<{text:string;audioBase64:string;audioMime:string}|null>(null);
  const [demoConsent,setDemoConsent]=useState(false);
  const previousConsentKey=useRef<string|null>(null);
  const previousIdentityScope=useRef<string|null>(null);
  const consentVersion=capabilities.data?.memory?2:1;
  const identityScope=`${accountEmail.trim().toLowerCase()}:${provider??"pending"}`;
  const consentKey=provider&&provider!=="off"?`lingua:provider-consent:v${consentVersion}:${accountEmail.trim().toLowerCase()}:${provider}`:null;
  const localVoice=selectLocalVoice(localVoices,selectedVoiceURI);
  const englishLocalVoice=selectEnglishLocalVoice(localVoices,selectedVoiceURI);
  const memoryKeys=provider&&provider!=="off"?conversationStorageKeys(accountEmail,provider):null;
  const memoryScope=memoryKeys?.conversation??"";
  const topicKeys=provider&&provider!=="off"?studyTopicBookmarkKeys(accountEmail,provider):null;
  const topicScope=topicKeys?.bookmark??"";
  useEffect(()=>{
    if(typeof window.speechSynthesis==="undefined")return;
    const synth=window.speechSynthesis;
    const refresh=()=>setLocalVoices(synth.getVoices());
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[]);
  useEffect(()=>{
    const identityChanged=previousIdentityScope.current!==identityScope;
    if(previousConsentKey.current===consentKey&&!identityChanged)return;
    previousIdentityScope.current=identityScope;
    previousConsentKey.current=consentKey;
    let accepted=false;
    if(consentKey){try{
      const stored=JSON.parse(window.localStorage.getItem(consentKey)??"null") as {accepted?:boolean;version?:number}|null;
      accepted=stored?.accepted===true&&stored?.version===consentVersion;
    }catch{/* Storage blocked: ask once in memory only. */}}
    invalidateConversation();
    stopCapture(false);stopAudioPlayers();stopSpeech();
    setNeuralAudios({});setNeuralFallback({});setAutoPlayId(null);
    setPendingMemory(null);setPreviewVoiceAudio(null);setPreviewVoiceNotice("");
    setConsent(accepted);setTermsAccepted(false);setVoice(false);setDemoConsent(false);setDemo(null);setPrivacyPrompt(false);
    setDraft("");setTranscriptReady(false);
    if(identityChanged){
      sequence.current=0;
      // Do not show text from the old provider/account during local history restoration.
      setMessages([{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
    }else{
      // Consent schema changes can occur after capabilities load; do not erase the conversation.
      setMessages(previous=>previous.map(m=>({...m,audioBase64:null})));
    }
  },[provider,consentKey,identityScope]);

  // Reload recovery uses a protected mutation, avoiding a shared cached query
  // whose result could outlive a login change. No LLM or learner-evidence writes.
  useEffect(()=>{
    if(!enabled||!consent||provider==="off")return;
    const epoch=conversationVersion.current;
    const request=++catalogRecoverySequence.current;
    let cancelled=false;
    void catalogPendingTask.mutateAsync().then(task=>{
      if(!cancelled&&request===catalogRecoverySequence.current&&isCurrent(epoch)){
        setRecoveredCatalogTask(task);
        rememberTopic(task);
      }
    }).catch(()=>{
      if(!cancelled&&request===catalogRecoverySequence.current&&isCurrent(epoch))
        setRecoveredCatalogTask(null);
    });
    return ()=>{cancelled=true;};
  },[enabled,consent,identityScope]);
    // Local history is optional, account-scoped and never includes audio.
  useEffect(()=>{
    // Provider off/unknown must not leave the previous learner's text visible.
    if(!memoryKeys){
      invalidateConversation();
      stopCapture(false);stopAudioPlayers();stopSpeech();
      setMessages([{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
      sequence.current=0;setMemoryChoice({scope:"",enabled:false});
      setPendingMemory(null);setDraft("");setTranscriptReady(false);
      setNeuralAudios({});setNeuralFallback({});setAutoPlayId(null);
      return;
    }
    invalidateConversation();
    stopCapture(false);stopAudioPlayers();stopSpeech();setAutoPlayId(null);setNeuralFallback({});
    setPendingMemory(null);setPreviewVoiceAudio(null);setDemo(null);
    setDraft("");setTranscriptReady(false);
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
  // Separate, explicit on-device consent. A topic bookmark is NOT a CAL state.
  useEffect(()=>{
    if(!topicKeys){setTopicChoice({scope:"",enabled:false,bookmark:null});return;}
    const restored=loadStudyTopicBookmark(window.localStorage,topicKeys);
    setTopicChoice({scope:topicScope,...restored});
  },[topicScope]);
  function rememberTopic(task:CatalogClientTask|null|undefined){
    if(!task||!topicKeys)return;
    const competencyId=getMicrotask(task.taskId)?.competencyId;
    if(!competencyId||!saveStudyTopicBookmark(window.localStorage,topicKeys,competencyId))return;
    const restored=loadStudyTopicBookmark(window.localStorage,topicKeys);
    setTopicChoice(previous=>previous.scope===topicScope?{scope:topicScope,...restored}:previous);
  }
  function toggleTopicBookmark(next:boolean){
    if(!topicKeys)return;
    if(!setStudyTopicBookmarkEnabled(window.localStorage,topicKeys,next)){
      setNotice("Este navegador não permite guardar o marcador local.");return;
    }
    if(next){
      const task=recoveredCatalogTask??[...messages].reverse().find(m=>m.catalogTask)?.catalogTask;
      const competencyId=task?getMicrotask(task.taskId)?.competencyId:undefined;
      if(competencyId)saveStudyTopicBookmark(window.localStorage,topicKeys,competencyId);
    }
    setTopicChoice({scope:topicScope,...loadStudyTopicBookmark(window.localStorage,topicKeys)});
  }
  function setMemoryEnabled(enabled:boolean){
    if(!memoryKeys)return;
    if(enabled){
      if(!enableChatMemory(window.localStorage,memoryKeys)){setNotice("Este navegador não permite salvar o histórico local.");return;}
      saveChatMemory(window.localStorage,memoryKeys,messages.filter(m=>m.id>0).map(({id,role,text,source})=>({id,role,text,source})));
    }else clearChatMemory(window.localStorage,memoryKeys,true);
    setMemoryChoice({scope:memoryScope,enabled});
  }
  function eraseConversation(){
    if(memoryKeys)clearChatMemory(window.localStorage,memoryKeys);
    if(topicKeys)clearStudyTopicBookmark(window.localStorage,topicKeys);
    setTopicChoice(previous=>previous.scope===topicScope?{...previous,bookmark:null}:previous);
    invalidateConversation();
    stopCapture(false);stopAudioPlayers();stopSpeech();setAutoPlayId(null);
    setMessages([{id:0,role:"assistant",text:greeting(profile),source:"local"}]);
    sequence.current=0;setPendingMemory(null);setNeuralAudios({});setNeuralFallback({});setPreviewVoiceAudio(null);setDemo(null);setDraft("");setTranscriptReady(false);setNotice("Histórico apagado neste dispositivo.");
  }

  function stopCapture(send:boolean) {
    held.current=false;
    const current=capture.current;
    if(!current) { generation.current++; setPermissionPending(false);return; }
    current.send=send;
    if(!send && capture.current===current)capture.current=null;
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
  async function reportCatalogRendered(task:CatalogClientTask):Promise<boolean>{
    if(!consent)return false;
    const epoch=conversationVersion.current;
    try {
      const response=await catalogRenderAck.mutateAsync({
        consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId,
      });
      if(isCurrent(epoch)&&response.status==="rejected")
        setNotice("A atividade não está mais ativa nesta sessão. Escolha novamente o assunto para continuar.");
      return isCurrent(epoch)&&(response.status==="recorded"||response.status==="duplicate");
    }catch{return false;}
  }
  async function buildPlan(){
    if(!consent){setTermsAccepted(false);setPrivacyPrompt(true);return;}
    if(!placementActive||placement.data?.nextTask||busy)return;
    const epoch=conversationVersion.current;
    const op=beginBusy();setNotice("");
    try{
      const res=await placementGenerate.mutateAsync({consent:true});
      if(!isCurrent(epoch))return;
      await placement.refetch();
      if(!isCurrent(epoch))return;
      append({role:"assistant",text:"Seu plano de quatro semanas foi salvo como sugestão provisória, sem classificação CEFR. Acesse Meu início para conferir as atividades e as habilidades ainda não avaliadas."});
      if(res.source==="rule_based")setNotice("A IA não conseguiu gerar sugestões. Foi salvo um plano básico transparente, que pode ser revisto.");
      setPlacementActive(false);onPlacementCompleted();
    }catch{if(isCurrent(epoch))setNotice("Não foi possível gerar ou salvar o plano agora. Suas três respostas continuam registradas.");}
    finally{finishBusy(op);}
  }
  async function submitMessage(authorized:boolean){
    const text=draft.trim();
    if(!text||inFlight.current||capture.current||held.current)return;
    if(placementActive&&text.length>800){setNotice("Nesta sondagem, use até 800 caracteres por resposta.");return;}
    const isPlacement=placementActive&&Boolean(placement.data?.nextTask);
    const viaASR=transcriptReady;
    catalogRecoverySequence.current++;
    const epoch=conversationVersion.current;
    setPendingMemory(null);
    const op=beginBusy();setNotice("");setTranscriptReady(false);
    setDraft("");
    const history=messages.slice(-TUTOR_MAX_HISTORY).map(({role,text})=>({role,text}));
    append({role:"user",text});
    try{
      if(isPlacement&&placement.data?.nextTask){
        await placementSubmit.mutateAsync({consent:true,taskId:placement.data.nextTask.id,
          answer:text,modality:viaASR?"asr_text":"text"});
        if(!isCurrent(epoch))return;
        const next=await placement.refetch();
        if(!isCurrent(epoch))return;
        if(next.data?.nextTask)append({role:"assistant",text:next.data.nextTask.prompt});
        else append({role:"assistant",text:"Obrigado! Agora temos três amostras de texto. Elas não bastam para atribuir um nível, mas podemos criar um plano inicial de quatro semanas. Clique em Gerar plano provisório."});
      }else{
        const res=await reply.mutateAsync({message:text,history,consent:authorized,provider,voice:authorized&&voice,
          inputModality:modalityForTutorReply(viaASR)});
        if(!isCurrent(epoch))return;
        setRecoveredCatalogTask(null);
        const deliveredTask="catalogTask" in res?res.catalogTask:null;
        append({role:"assistant",text:res.text,source:res.source,audioBase64:res.audioBase64,voiceStatus:res.voiceStatus,catalogTask:deliveredTask});
        rememberTopic(deliveredTask);
        if(viaASR)setNotice("Texto recebido por transcrição. Ele não mede pronúncia. Se estiver respondendo a um exercício fechado, digite a resposta para que seja avaliada.");
        if(res.memoryCandidate&&capabilities.data?.memory)
          setPendingMemory({...res.memoryCandidate,sourceMessage:text});
      }
    }catch{
      if(isCurrent(epoch)){setNotice("Não foi possível obter resposta. Seu texto permanece na conversa; tente novamente.");setDraft(text);setTranscriptReady(viaASR);}
    }finally{
      finishBusy(op);
    }
  }
  async function restartSavedTopic(){
    const competencyId=topicChoice.scope===topicScope?topicChoice.bookmark?.competencyId:undefined;
    const selection=competencyId?studyTopicRestartRequest(competencyId):null;
    if(!selection||!enabled||inFlight.current||held.current||recording||permissionPending||placementActive)return;
    if(draft.trim()){setNotice("Antes de recomeçar, envie ou apague seu rascunho atual.");return;}
    if(!consent){
      setSettingsOpen(false);setTermsAccepted(false);setPrivacyPrompt(true);
      return;
    }
    const epoch=conversationVersion.current;
    const history=messages.slice(-TUTOR_MAX_HISTORY).map(({role,text})=>({role,text}));
    catalogRecoverySequence.current++;
    setRecoveredCatalogTask(null);setPendingMemory(null);setOpen(true);setSettingsOpen(false);
    const op=beginBusy();
    setNotice("Recomeçando este assunto, sem recuperar acertos, notas ou progresso anterior.");
    append({role:"user",text:selection.message});
    try{
      const res=await reply.mutateAsync({
        message:selection.message,history,consent:true,provider,voice:false,
        catalogCompetencyId:selection.catalogCompetencyId,catalogRestart:selection.catalogRestart,
        // No inputModality: this is a UI selection, NOT independently typed work.
        // The existing server boundary treats missing modality conservatively.
      });
      if(!isCurrent(epoch))return;
      const deliveredTask="catalogTask" in res?res.catalogTask:null;
      append({role:"assistant",text:res.text,source:res.source,audioBase64:res.audioBase64,
        voiceStatus:res.voiceStatus,catalogTask:deliveredTask});
      rememberTopic(deliveredTask);
      if(!deliveredTask)setNotice("Não foi possível iniciar uma nova atividade desse assunto. Tente novamente.");
    }catch{
      if(isCurrent(epoch))setNotice("Não foi possível reabrir o assunto. Você pode tentar novamente.");
    }finally{finishBusy(op);}
  }
  async function acceptMemory(){
    if(!pendingMemory||saveMemory.isPending)return;
    const epoch=conversationVersion.current;
    try{
      await saveMemory.mutateAsync({...pendingMemory,consent:true});
      if(!isCurrent(epoch))return;
      setPendingMemory(null);setNotice("Memória salva com sua autorização. Você pode apagá-la nas configurações.");
      await savedMemories.refetch();
    }catch{if(isCurrent(epoch))setNotice("Não foi possível guardar esta memória. Ela não foi confirmada.");}
  }
  async function forgetMemory(id:number){
    const epoch=conversationVersion.current;
    try{await deleteMemory.mutateAsync({id});if(isCurrent(epoch))await savedMemories.refetch();}
    catch{if(isCurrent(epoch))setNotice("Não foi possível apagar esta memória.");}
  }
  async function forgetAllMemories(){
    if(!window.confirm("Apagar todas as memórias pessoais guardadas no servidor?"))return;
    const epoch=conversationVersion.current;
    try{await clearMemories.mutateAsync();if(!isCurrent(epoch))return;await savedMemories.refetch();if(!isCurrent(epoch))return;setPendingMemory(null);setNotice("Memórias do servidor apagadas.");}
    catch{if(isCurrent(epoch))setNotice("Não foi possível apagar as memórias.");}
  }
  function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.trim()||busy||inFlight.current)return;
    if(enabled&&!consent){setTermsAccepted(false);setPrivacyPrompt(true);return;}
    void submitMessage(consent);
  }
  function acceptPrivacy(){
    if(!enabled||!termsAccepted||revocationPending||revocationFailed)return;
    setConsent(true);setPrivacyPrompt(false);setTermsAccepted(false);
    if(consentKey)try{window.localStorage.setItem(consentKey,JSON.stringify({version:consentVersion,accepted:true,agreedAt:new Date().toISOString()}));}catch{/* Consent still valid in this tab. */}

    if(draft.trim())void submitMessage(true);
    else setNotice("Pode falar! Para gravar, segure o microfone.");
  }
  async function speakWelcome(){
    if(inFlight.current||!consent||!capabilities.data?.tts)return;
    const requestVersion=conversationVersion.current;
    const op=beginBusy();setNotice("");
    try{
      const res=await welcome.mutateAsync({consent:true,provider});
      if(!isCurrent(requestVersion))return;
      setMessages(previous=>previous.map(m=>m.id===0?{...m,text:res.text??m.text,audioBase64:res.audioBase64,voiceStatus:res.voiceStatus}:m));
      if(!res.audioBase64)setNotice("Voz indisponível; a mensagem de boas-vindas continua em texto.");
    }catch{if(isCurrent(requestVersion))setNotice("Voz indisponível. Você ainda pode conversar por texto.");}
    finally{finishBusy(op);}
  }
  function stopAudioPlayers(except?:HTMLAudioElement){
    audioRoot.current?.querySelectorAll("audio").forEach(audio=>{
      if(audio!==except)audio.pause();
    });
  }
  // Attempt playback of newly generated audio; Safari/mobile may block it after an async TTS request.
  // Keep native controls visible and explain the fallback rather than claiming autoplay worked.
  useEffect(()=>{
    if(autoPlayId===null)return;
    const epoch=conversationVersion.current;
    const audio=autoPlayRef.current;
    if(!audio){setAutoPlayId(null);return;}
    stopAudioPlayers(audio);stopSpeech();
    void audio.play().catch((error:unknown)=>{
      if(!isCurrent(epoch))return;
      const blocked=error instanceof DOMException&&error.name==="NotAllowedError";
      setNotice(blocked?
        "Áudio preparado. Toque em reproduzir no player para ouvir; este navegador bloqueou a reprodução automática.":
        "Não foi possível iniciar o áudio. Use o player para tentar reproduzi-lo.");
    });
    setAutoPlayId(null);
  },[autoPlayId,neuralAudios]);
  function stopSpeech(){
    currentSpeech.current=null;
    if(typeof window.speechSynthesis!=="undefined")window.speechSynthesis.cancel();
    setSpeakingId(null);
  }
  function browserSpeak(text:string,id:number,voiceURI?:string){
    if(speakingId===id){stopSpeech();return;}
    const selected=localVoices.find(v=>v.voiceURI===voiceURI&&v.localService===true);
    if(typeof window.speechSynthesis==="undefined"||typeof SpeechSynthesisUtterance==="undefined"||!selected){
      setNotice("Uma voz local compatível não está disponível. Confira as configurações do tutor.");return;
    }
    stopAudioPlayers();stopSpeech();
    const synth=window.speechSynthesis;
    const utterance=new SpeechSynthesisUtterance(speechText(text));
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
    const requestVersion=conversationVersion.current;
    const op=beginBusy();setGeneratingId(message.id);setNotice("");
    try{
      const result=await neural.mutateAsync({consent:true,provider:"groq",voice:voiceSettings.neuralVoice??"troy",text:phrase});
      if(isCurrent(requestVersion)){
        setNeuralAudios(old=>({...old,[message.id]:result.audioBase64}));
        setNeuralFallback(old=>({...old,[message.id]:false}));
        setAutoPlayId(message.id);
      }
    }catch(error){
      if(isCurrent(requestVersion)){
        setNeuralFallback(old=>({...old,[message.id]:true}));
        const quota=(error as {data?:{code?:string}})?.data?.code==="TOO_MANY_REQUESTS";
        setNotice(englishLocalVoice?
          (quota?"Cota de voz neural atingida.":"Voz neural indisponível.")+" Use Ouvir frase (voz local).":
          (quota?"Cota de voz neural atingida.":"Voz neural indisponível.")+" Sem voz inglesa local neste dispositivo; você pode tentar novamente mais tarde.");
      }
    }finally{finishBusy(op);}
  }
  async function previewNeuralVoice(){
    if(inFlight.current)return;
    if(!consent){setSettingsOpen(false);setPrivacyPrompt(true);return;}
    if(!enabled||!capabilities.data?.neuralEnglish){setPreviewVoiceNotice("Voz neural não habilitada nesta conta.");return;}
    const epoch=conversationVersion.current;
    const op=beginBusy();setPreviewVoiceNotice("");setPreviewVoiceAudio(null);
    try{
      const result=await neural.mutateAsync({consent:true,provider:"groq",voice:voiceSettings.neuralVoice??"troy",
        text:"Hello! I am your English tutor. Let us practice together."});
      if(isCurrent(epoch))setPreviewVoiceAudio(result.audioBase64);
    }catch(error){
      if(isCurrent(epoch)){
        const message=(error as {message?:unknown})?.message;
        const diagnosed=typeof message==="string"&&message.startsWith("Groq recusou a voz neural (HTTP 400):")&&message.length<=180;
        setPreviewVoiceNotice((error as {data?:{code?:string}})?.data?.code==="TOO_MANY_REQUESTS"?
          "Limite gratuito de voz atingido. Aguarde a renovação da cota.":
          diagnosed?message:"Erro na voz neural Groq. Nenhum fallback de áudio externo foi acionado.");
      }
    }finally{finishBusy(op);}
  }
  async function playGeminiDemo(){
    if(inFlight.current||!demoConsent||!capabilities.data?.geminiDemo)return;
    const epoch=conversationVersion.current;
    const op=beginBusy();setNotice("");
    try {const res=await gemini.mutateAsync({consent:true,phraseIndex:1});if(isCurrent(epoch))setDemo(res);}
    catch{if(isCurrent(epoch))setNotice("Voz Gemini indisponível. O chat e a voz local continuam separados.");}
    finally{finishBusy(op);}
  }
  async function startCapture(){
    if(!consent&&enabled){setTermsAccepted(false);setPrivacyPrompt(true);return;}
    if(inFlight.current){setNotice("Conclua a operação em andamento antes de gravar.");return;}
    if(capture.current||held.current||!consent||!capabilities.data?.asr)return;
    if(draft.trim()){setNotice("Envie ou apague o texto antes de gravar.");return;}
    stopAudioPlayers();stopSpeech();
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setNotice("Este navegador não permite gravação. Use o teclado.");return;
    }
    held.current=true;setPermissionPending(true);setNotice("");
    const epoch=conversationVersion.current;
    const attempt=++generation.current;
    let stream:MediaStream|undefined;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!isCurrent(epoch)||!held.current||attempt!==generation.current){
        stream.getTracks().forEach(t=>t.stop());return;
      }
      const mime=tutorAudioTypes.find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime)throw new Error("Formato não suportado");
      const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:32_000});
      const current:Capture={recorder,stream,chunks:[],size:0,send:false};
      capture.current=current;
      recorder.ondataavailable=(event)=>{
        if(!isCurrent(epoch))return;
        if(event.data.size){current.chunks.push(event.data);current.size+=event.data.size;}
        if(current.size>TUTOR_MAX_AUDIO_BYTES){
          if(capture.current===current)stopCapture(false);
          if(isCurrent(epoch))setNotice("Áudio excedeu o limite.");
        }
      };
      recorder.onstop=async()=>{
        // A late stop event from an old recorder must not clear a newer capture.
        if(capture.current===current)capture.current=null;
        current.stream.getTracks().forEach(t=>t.stop());
        if(!isCurrent(epoch)||!current.send||!current.size||current.size>TUTOR_MAX_AUDIO_BYTES)return;
        const blob=new Blob(current.chunks,{type:mime});
        const op=beginBusy();
        try{
          const base64=await new Promise<string>((resolve,reject)=>{
            const reader=new FileReader();
            reader.onerror=()=>reject(new Error("Falha de leitura"));
            reader.onload=()=>resolve(String(reader.result).split(",")[1]??"");
            reader.readAsDataURL(blob);
          });
          if(!isCurrent(epoch))return;
          const result=await transcribe.mutateAsync({consent:true,provider,audio:{mime:mime as TutorAudioType,base64}});
          if(isCurrent(epoch)){
            setDraft(result.text);setTranscriptReady(true);
            setNotice("Confira a transcrição e envie quando estiver correta. Ela não é uma nota de pronúncia.");
          }
        }catch(error){if(isCurrent(epoch))setNotice((error as {data?:{code?:string}})?.data?.code==="TOO_MANY_REQUESTS"?"O tutor está descansando. Tente novamente em alguns minutos.":"Não foi possível transcrever. Tente novamente ou digite.");}
        finally{finishBusy(op);}
      };
      recorder.onerror=()=>{
        if(capture.current===current)stopCapture(false);
        if(isCurrent(epoch))setNotice("Falha na gravação. Use o teclado.");
      };
      recorder.start(250);
      current.timer=setTimeout(()=>stopCapture(true),TUTOR_MAX_RECORD_MS);
      setRecording(true);
    }catch{
      stream?.getTracks().forEach(t=>t.stop());capture.current=null;held.current=false;
      if(isCurrent(epoch))setNotice("Não foi possível acessar o microfone. Verifique a permissão ou digite.");
    }finally{if(isCurrent(epoch)&&attempt===generation.current)setPermissionPending(false);}
  }
  function pointerStart(event:PointerEvent<HTMLButtonElement>){
    if(event.button!==0)return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    void startCapture();
  }
  function minimize(){stopCapture(false);stopAudioPlayers();stopSpeech();setSettingsOpen(false);setPrivacyPrompt(false);setOpen(false);}
  async function confirmRevocation(){
    const epoch=conversationVersion.current;
    setRevocationPending(true);setRevocationFailed(false);
    try{
      await revokeCatalogConsent.mutateAsync();
      if(isCurrent(epoch))setNotice("Envio à IA desativado; cancelamento confirmado pelo servidor.");
    }catch{
      if(isCurrent(epoch)){setRevocationFailed(true);setNotice("Envio local desativado, mas o servidor não confirmou o cancelamento. Tente novamente.");}
    }finally{setRevocationPending(false);}
  }
  function updateConsent(next:boolean){
    if(!next){if(consentKey)try{window.localStorage.removeItem(consentKey);}catch{/* no local storage */}
      invalidateConversation();
      stopAudioPlayers();stopSpeech();stopCapture(false);setVoice(false);setTranscriptReady(false);setDraft("");
      setPendingMemory(null);setPreviewVoiceAudio(null);setPreviewVoiceNotice("");setDemo(null);
      setMessages(previous=>previous.map(m=>({...m,audioBase64:null})));setNeuralAudios({});setNeuralFallback({});setAutoPlayId(null); }
    setConsent(next);
    if(!next)void confirmRevocation();
  }

  if(!open)return <button type="button" onClick={()=>setOpen(true)} aria-label={"Conversar com "+profile.tutorName}
    className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-4 text-white shadow-lg">
    <MessageCircle size={21}/><Mic size={15}/><span className="max-w-40 truncate text-sm font-semibold">{profile.tutorName}</span>
  </button>;

  const recoveredMessageId=recoveredCatalogTask
    ? [...messages].reverse().find(m=>m.role==="assistant"&&
        splitCatalogTaskText(m.text,recoveredCatalogTask))?.id
    : undefined;
  const recoveryWithoutMessage=Boolean(recoveredCatalogTask&&recoveredMessageId===undefined&&
    !messages.some(m=>m.catalogTask?.deliveryId===recoveredCatalogTask.deliveryId));
  return <aside ref={audioRoot} aria-label={"Chat com "+profile.tutorName}
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
        <p className="mt-3 text-sm leading-6">Para responder, {provider==="groq"?"o Groq":provider==="openai"?"a OpenAI":"um serviço externo"} processará sua mensagem, seu perfil de estudo, o histórico recente, as memórias pessoais que você tiver aprovado (se o recurso estiver habilitado) e as gravações que você decidir enviar. Não inclua informações sensíveis.</p>
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
        <button type="button" disabled={!localVoice} onClick={()=>browserSpeak("Hello! Vamos praticar inglês.",-1,localVoice?.voiceURI)} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold disabled:opacity-40">
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
        <div className="border-t border-ink/10 pt-3 space-y-2">
          <h4 className="text-sm font-semibold">Marcador opcional de assunto</h4>
          <label className="flex items-start gap-2 text-sm leading-5">
            <input type="checkbox" className="mt-1" disabled={!topicKeys}
              checked={topicChoice.scope===topicScope&&topicChoice.enabled}
              onChange={e=>toggleTopicBookmark(e.target.checked)}/>
            Lembrar somente qual assunto estudei por até 7 dias neste aparelho
          </label>
          <p className="text-xs leading-5 text-ink-muted">Consentimento separado do histórico: guarda apenas o identificador de um assunto. Não guarda respostas, resultados, níveis nem competências dominadas. Após reinício, você poderá recomeçar o assunto do zero.</p>
          {topicChoice.scope===topicScope&&topicChoice.bookmark&&
            <button type="button" disabled={!enabled||busy||recording||placementActive}
              onClick={()=>void restartSavedTopic()} className="text-sm font-semibold text-teal underline disabled:opacity-40">
              Recomeçar: {getMicrocompetency(topicChoice.bookmark.competencyId)?.titlePt??"assunto salvo"}
            </button>}
        </div>
        <button type="button" onClick={eraseConversation} className="text-sm font-semibold text-red-700 underline">Apagar conversa e marcador neste aparelho</button>
      </div>
      {capabilities.data?.memory&&<div className="border-t border-ink/10 pt-5 space-y-3">
        <h3 className="font-semibold">Memórias pessoais aprovadas</h3>
        <p className="text-xs leading-5 text-ink-muted">Só guardamos trechos sobre você que você confirmou. São distintos do histórico local e não comprovam diplomas ou domínio de inglês. Use Apagar para retirar um fato da próxima conversa.</p>
        {savedMemories.isError&&<p role="alert" className="text-xs text-red-700">Memórias indisponíveis. Confirme a atualização do banco.</p>}
        {savedMemories.data?.length===0&&<p className="text-xs text-ink-muted">Nenhuma memória salva.</p>}
        {savedMemories.data?.map(item=><div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-paper p-3 text-xs">
          <span className="break-words">{item.fato}</span>
          <button type="button" disabled={deleteMemory.isPending} onClick={()=>void forgetMemory(item.id)} className="shrink-0 font-semibold text-red-700 underline">Apagar</button>
        </div>)}
        {!!savedMemories.data?.length&&<button type="button" disabled={clearMemories.isPending} onClick={()=>void forgetAllMemories()} className="text-xs font-semibold text-red-700 underline">Apagar todas as memórias</button>}
      </div>}
      <div className="border-t border-ink/10 pt-5">
        <h3 className="font-semibold">Privacidade da conversa</h3>
        {revocationPending&&<p role="status">Confirmando cancelamento no servidor…</p>}
        {revocationFailed&&<button type="button" onClick={()=>void confirmRevocation()}>Tentar confirmar cancelamento novamente</button>}
        <p className="mt-2 text-xs leading-5 text-ink-muted">Seu chat pode enviar texto e gravações ao {provider==="groq"?"Groq":provider==="openai"?"serviço OpenAI":"provedor externo"} somente após autorização. O aceite é lembrado apenas neste navegador, por conta e provedor, até você revogar ou limpar os dados locais. Não constitui registro de consentimento auditado no servidor.</p>
        {consent?<button type="button" onClick={()=>updateConsent(false)} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold">Desativar envio à IA</button>:
          <button type="button" disabled={!enabled||revocationPending||revocationFailed} onClick={()=>{setSettingsOpen(false);setPrivacyPrompt(true);}} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold disabled:opacity-40">Autorizar envio à IA</button>}
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
        {messages.map(m=>{const phrase=englishExcerpt(m.text);
          const resolved=resolveTutorAudio({
            assistant:m.role==="assistant",hasAudio:Boolean(m.audioBase64||neuralAudios[m.id]),
            isWelcome:m.id===0,consent,ttsAvailable:capabilities.data?.tts===true,
            capabilitiesSettled:!capabilities.isLoading,
            tutorEnabled:enabled,provider,neuralAvailable:capabilities.data?.neuralEnglish===true,
            hasEnglishPhrase:Boolean(phrase),hasEnglishLocalVoice:Boolean(englishLocalVoice),
            hasGeneralLocalVoice:Boolean(localVoice),neuralFailed:Boolean(neuralFallback[m.id]),
            speakingLocally:speakingId===m.id
          });
          const {action}=resolved;
          const playbackVoice=resolved.localVoiceKind==="english"?englishLocalVoice:
            resolved.localVoiceKind==="general"?localVoice:null;
          return <div key={m.id} className={m.role==="user"?"flex justify-end":"flex justify-start"}>
          <div className={m.role==="user"?"max-w-[86%] rounded-2xl bg-ink px-4 py-3 text-sm text-white":"max-w-[92%] rounded-2xl bg-paper px-4 py-3 text-sm"}>
            <TutorCatalogTaskView key={m.catalogTask?.deliveryId??m.id} text={m.text}
              task={m.catalogTask??(m.role==="assistant"&&m.id===recoveredMessageId?recoveredCatalogTask:null)}
              active={open&&!settingsOpen&&consent} onRendered={reportCatalogRendered}/>
            {m.source==="local"&&<p className="mt-2 text-[11px] text-ink-muted">Resposta local · IA indisponível ou não autorizada</p>}
            {m.role==="assistant"&&m.audioBase64&&<audio className="mt-2 w-full" controls preload="none" onPlay={e=>{if(recording||permissionPending){e.currentTarget.pause();setNotice("Não é possível reproduzir áudio durante a gravação.");return;}stopSpeech();stopAudioPlayers(e.currentTarget);}} src={"data:audio/mpeg;base64,"+m.audioBase64}/>}
            {m.role==="assistant"&&!m.audioBase64&&neuralAudios[m.id]&&
              <audio ref={autoPlayId===m.id?autoPlayRef:undefined} controls preload="none" className="mt-2 w-full" onPlay={e=>{if(recording||permissionPending){e.currentTarget.pause();setNotice("Não é possível reproduzir áudio durante a gravação.");return;}stopSpeech();stopAudioPlayers(e.currentTarget);}} src={"data:audio/wav;base64,"+neuralAudios[m.id]}/>}
            <TutorAudioControls
              action={action} tutorName={profile.tutorName} busy={busy}
              generating={generatingId===m.id} recording={recording}
              permissionPending={permissionPending} speakingLocally={speakingId===m.id}
              hasEnglishPhrase={Boolean(phrase)} voiceUnavailable={m.voiceStatus==="unavailable"}
              onNeural={()=>void playNeural(m)}
              onLocal={()=>browserSpeak(phrase??m.text,m.id,playbackVoice?.voiceURI)}
              onWelcome={()=>void speakWelcome()}
            />
          </div>
        </div>})}
        {recoveryWithoutMessage&&recoveredCatalogTask&&<div className="rounded-2xl bg-paper px-4 py-3 text-sm">
          <p className="mb-2 text-xs text-ink-muted">Atividade pendente recuperada desta sessão (não é progresso persistido).</p>
          <TutorCatalogTaskView key={recoveredCatalogTask.deliveryId}
            text={recoveredCatalogTask.promptText} task={recoveredCatalogTask}
            active={open&&!settingsOpen&&consent} onRendered={reportCatalogRendered}/>
        </div>}
                {pendingMemory&&<div role="group" aria-label="Permissão para lembrar fato pessoal" className="rounded-xl border border-teal/30 bg-paper p-4 text-sm">
          <p className="font-semibold">{profile.tutorName}: Posso guardar este detalhe para personalizar suas próximas aulas?</p>
          <p className="mt-2 break-words">“{pendingMemory.fato}”</p>
          <p className="mt-2 text-xs text-ink-muted">Fica salvo na sua conta até você apagar. Não é prova de qualificação. Você pode recusar e continuar estudando normalmente.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={saveMemory.isPending} onClick={()=>void acceptMemory()} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Sim, guardar</button>
            <button type="button" disabled={saveMemory.isPending} onClick={()=>setPendingMemory(null)} className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold">Não guardar</button>
          </div>
        </div>}
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
        {topicChoice.scope===topicScope&&topicChoice.bookmark&&!recoveredCatalogTask&&
          !messages.some(m=>Boolean(m.catalogTask))&&!placementActive&&
          <button type="button" disabled={!enabled||busy||recording||permissionPending}
            onClick={()=>void restartSavedTopic()}
            className="text-left text-xs font-semibold text-teal underline disabled:opacity-40">
            Recomeçar assunto salvo: {getMicrocompetency(topicChoice.bookmark.competencyId)?.titlePt??"assunto"}
          </button>}
        {memoryKeys&&memoryChoice.scope===memoryScope&&!memoryChoice.enabled&&<button type="button" className="text-left text-xs font-semibold text-teal underline" onClick={()=>setMemoryEnabled(true)}>Guardar esta conversa neste navegador (opcional)</button>}
        {memoryKeys&&memoryChoice.scope===memoryScope&&memoryChoice.enabled&&<p className="text-[10px] text-ink-muted">Histórico local ativado · até 30 dias · apagar nas configurações</p>}
        {notice&&<p role="status" className="text-xs leading-4 text-ink-muted">{notice}</p>}
        {transcriptReady&&<p className="text-xs font-semibold text-teal">Confira o texto reconhecido antes de enviar.</p>}
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea aria-label="Sua mensagem" rows={2} maxLength={TUTOR_MAX_TEXT} value={draft}
            onChange={e=>{setDraft(e.target.value);setTranscriptReady(old=>transcriptOriginAfterEdit(old,e.target.value));}} disabled={busy||recording||permissionPending}
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
