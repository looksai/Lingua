import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, ListChecks, LogOut, MessageSquare, Settings2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ReadingLab from "@/components/ReadingLab";
import ReviewDeck from "@/components/ReviewDeck";
import TutorChat, { type TutorVoiceSettings } from "@/components/TutorChat";
import {availableLocalVoices,selectLocalVoice} from "@/lib/tutor-speech";
import { supportedFirstAccessLanguages, tutorPersonaLabels, interestLabels, type TutorPersona, type LearnerInterest } from "@shared/onboarding";

type Snapshot = inferRouterOutputs<AppRouter>["onboarding"]["me"];
type View = "dashboard" | "read" | "review" | "settings";
const NEURAL_VOICES = ["troy","daniel","austin","autumn","diana","hannah"] as const;
const DEFAULT_VOICE:TutorVoiceSettings={voiceURI:"",rate:0.95,pitch:1,neuralVoice:"troy"};
function loadVoiceSettings():TutorVoiceSettings {
  if(typeof window==="undefined")return DEFAULT_VOICE;
  try {
    const stored=JSON.parse(window.localStorage.getItem("lingua:tutor-voice:v1")??"null") as Partial<TutorVoiceSettings>|null;
    if(stored&&typeof stored.voiceURI==="string" && typeof stored.rate==="number" && stored.rate>=0.75&&stored.rate<=1.15 && typeof stored.pitch==="number"&&stored.pitch>=0.8&&stored.pitch<=1.2)
      return {voiceURI:stored.voiceURI,rate:stored.rate,pitch:stored.pitch,
        neuralVoice:NEURAL_VOICES.find(v=>v===stored.neuralVoice)??"troy"};
  }catch{/* Browser storage unavailable. */}
  return DEFAULT_VOICE;
}

export default function StudentHome({ snapshot, email }: { snapshot: Snapshot; email: string }) {
  const profile = snapshot.profile!;
  const [view, setView] = useState<View>("dashboard");
  const [tutorName, setTutorName] = useState(profile.tutorName);
  const [tutorPersona, setTutorPersona] = useState<TutorPersona>(profile.tutorPersona);
  const [interest, setInterest] = useState<LearnerInterest>(profile.interest);
  const [allowAIFeedback, setAllowAIFeedback] = useState(profile.allowAIFeedback === 1);
  const [saved, setSaved] = useState(false);
  const [voiceSettings,setVoiceSettings]=useState<TutorVoiceSettings>(loadVoiceSettings);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const selectedVoice=selectLocalVoice(voices,voiceSettings.voiceURI);
  const speechCapabilities=trpc.tutor.capabilities.useQuery(undefined,{retry:false,refetchOnWindowFocus:false});
  const neuralPreview=trpc.tutor.neuralEnglish.useMutation();
  const [voicePreviewAudio,setVoicePreviewAudio]=useState<string|null>(null);
  const [voicePreviewNotice,setVoicePreviewNotice]=useState("");
  async function previewNeuralVoice(){
    setVoicePreviewAudio(null);setVoicePreviewNotice("");
    if(speechCapabilities.data?.provider!=="groq"||!speechCapabilities.data.neuralEnglish){
      setVoicePreviewNotice("A voz neural não está habilitada nesta conta de testes.");return;
    }
    const key=`lingua:provider-consent:v1:${email.trim().toLowerCase()}:groq`;
    let accepted=false;
    try{const raw=JSON.parse(window.localStorage.getItem(key)??"null") as {accepted?:boolean;version?:number}|null;
      accepted=raw?.accepted===true&&raw.version===1;}catch{/* prompt required */}
    if(!accepted){setVoicePreviewNotice("Antes de testar, abra a conversa com o tutor e autorize o envio ao Groq.");return;}
    const chosen=voiceSettings.neuralVoice??"troy";
    try{
      const result=await neuralPreview.mutateAsync({consent:true,provider:"groq",voice:chosen,
        text:"Hello! I am your English tutor. Let us practice together."});
      setVoicePreviewAudio(result.audioBase64);
    }catch(error){
      const code=(error as {data?:{code?:string}})?.data?.code;
      setVoicePreviewNotice(code==="TOO_MANY_REQUESTS"?"O limite gratuito de voz foi atingido. Tente novamente após a renovação da cota.":
        "Não foi possível gerar a prévia neural agora. A voz local continua disponível.");
    }
  }
  useEffect(()=>{
    try{window.localStorage.setItem("lingua:tutor-voice:v1",JSON.stringify(voiceSettings));}catch{/* Local playback still works in this session. */}
  },[voiceSettings]);
  useEffect(()=>{
    if(typeof window.speechSynthesis==="undefined")return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(synth.getVoices());
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[]);
  const utils = trpc.useUtils();
  const preferences = trpc.onboarding.saveProfile.useMutation();
  const resume = trpc.onboarding.resume.useMutation();
  const logout = trpc.auth.logout.useMutation();
  const items = trpc.learning.listItems.useQuery({ limit: 100 }, { retry: false });
  const recorded = snapshot.responses.length;
  const plan = snapshot.plan!;
  const deferred = profile.onboardingStatus === "deferred";

  async function signOut() {
    try {
      await logout.mutateAsync();
      await utils.invalidate();
      window.location.assign("/");
    } catch { /* show error */ }
  }

  async function resumeDiagnostic() {
    try { await resume.mutateAsync(); await utils.onboarding.me.invalidate(); } catch { /* show error */ }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    try {
      await preferences.mutateAsync({
        ...supportedFirstAccessLanguages, tutorName: tutorName.trim(), tutorPersona, interest, allowAIFeedback,
      });
      await utils.onboarding.me.invalidate();
      setSaved(true);
    } catch { /* show error */ }
  }

  return <div className="min-h-screen bg-paper text-ink">
    <header className="border-b border-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <span className="font-display text-3xl">lingua<span className="text-teal">/</span></span>
        <span className="text-sm text-ink-muted">Seu espaço • {email}</span>
        <button onClick={signOut} disabled={logout.isPending} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted"><LogOut size={16}/> Sair</button>
      </div>
    </header>
    <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pt-6">
      {([
        ["dashboard", MessageSquare, "Meu início"],
        ["read", BookOpen, "Ler e praticar"],
        ["review", ListChecks, "Revisar"],
        ["settings", Settings2, "Meu tutor"],
      ] as const).map(([id, Icon, label]) => (
        <button key={id} onClick={() => setView(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${view === id ? "bg-ink text-white" : "border border-ink/15 bg-white"}`}><Icon size={16}/>{label}</button>
      ))}
    </div>
    <main className="mx-auto max-w-6xl px-5 py-10">
      {view === "dashboard" && <>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Bem-vindo ao seu espaço</p>
        <h1 className="font-display text-4xl leading-tight sm:text-6xl">
          Seu tutor <span className="text-teal">{profile.tutorName}</span> está aqui.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink-muted">Seu percurso começa com o que você escolheu. Não inventamos níveis, notas ou experiências que você ainda não viveu.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-ink/10 bg-white p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Seu plano inicial • exploratório</p>
            <h2 className="mt-3 font-display text-3xl">{plan.title}</h2>
            <p className="mt-4 text-sm leading-6">{plan.objective}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Exemplos próximos de {plan.context}.</p>
            <p className="mt-3 border-l-2 border-teal pl-3 text-xs leading-5 text-ink-muted">{plan.reason} {plan.limits}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setView("read")} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Praticar leitura</button>
              <button onClick={() => setView("review")} className="rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold">Ver minhas revisões</button>
            </div>
          </section>
          <section className="rounded-2xl border border-ink/10 bg-white p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Seu ponto de partida</p>
            <p className="mt-4 text-4xl font-semibold">{recorded}<span className="text-base font-normal text-ink-muted"> / 5 respostas registradas</span></p>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              {recorded === 0 ? "Você ainda não fez a triagem textual." : "Respostas de leitura e escrita. Ainda não equivalem a uma avaliação de proficiência."}
            </p>
            <p className="mt-3 text-sm">Palavras salvas no SRS: {items.isError ? "indisponível" : items.isLoading ? "carregando" : items.data?.length ?? 0}</p>
            {deferred && <button onClick={resumeDiagnostic} disabled={resume.isPending} className="mt-6 text-sm font-semibold text-teal underline">
              Retomar a conversa inicial
            </button>}
            {resume.error && <p role="alert" className="mt-2 text-sm text-red-700">{resume.error.message}</p>}
          </section>
        </div>
      </>}
      {view === "read" && <>
        <h1 className="mb-3 font-display text-4xl">Laboratório de leitura</h1>
        <p className="mb-8 text-sm text-ink-muted">Texto de prática inicial. O shadowing local mede duração e pausas, não certifica pronúncia.</p>
        <ReadingLab/>
      </>}
      {view === "review" && <>
        <h1 className="mb-3 font-display text-4xl">Minhas revisões</h1>
        <p className="mb-8 text-sm text-ink-muted">O SRS agenda retomadas; não atribui nível de inglês.</p>
        <ReviewDeck/>
      </>}
      {view === "settings" && <section className="max-w-xl rounded-2xl border border-ink/10 bg-white p-7">
        <h1 className="font-display text-3xl">Meu tutor</h1>
        <p className="mt-3 mb-6 text-sm text-ink-muted">Você pode mudar o nome e o tom sempre que quiser.</p>
        <form onSubmit={savePreferences} className="space-y-5">
          <label className="block text-sm font-semibold">Nome<input required maxLength={40} value={tutorName} onChange={e => setTutorName(e.target.value)} className="mt-2 w-full rounded-lg border p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Tom<select value={tutorPersona} onChange={e=>setTutorPersona(e.target.value as TutorPersona)} className="mt-2 w-full rounded-lg border p-3 font-normal">{Object.entries(tutorPersonaLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block text-sm font-semibold">Interesse<select value={interest} onChange={e=>setInterest(e.target.value as LearnerInterest)} className="mt-2 w-full rounded-lg border p-3 font-normal">{Object.entries(interestLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <div className="space-y-4 border-t border-ink/10 pt-5">
            <h2 className="font-display text-2xl">Voz do tutor</h2>
            <div className="rounded-xl border border-ink/10 bg-paper p-4">
              <p className="font-semibold">Voz neural em inglês · Groq</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">O Orpheus fala frases curtas em inglês. O áudio é gerado quando você solicita e usa a cota da sua conta Groq; não é a voz das explicações em português.</p>
              <label className="mt-3 block text-sm font-semibold">Escolher voz neural
                <select value={voiceSettings.neuralVoice??"troy"}
                  onChange={e=>{setVoicePreviewAudio(null);setVoicePreviewNotice("");setVoiceSettings(p=>({...p,neuralVoice:e.target.value as NonNullable<TutorVoiceSettings["neuralVoice"]>}));}}
                  className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal">
                  {(["troy","daniel","austin","autumn","diana","hannah"] as const).map(id=><option key={id} value={id}>{id[0].toUpperCase()+id.slice(1)}</option>)}
                </select>
              </label>
              <button type="button" disabled={neuralPreview.isPending} onClick={()=>void previewNeuralVoice()}
                className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {neuralPreview.isPending?"Gerando prévia…":"Testar esta voz neural"}
              </button>
              {voicePreviewAudio&&<audio controls autoPlay preload="none" className="mt-3 w-full" src={"data:audio/wav;base64,"+voicePreviewAudio}/>}
              {voicePreviewNotice&&<p role="status" className="mt-2 text-xs text-ink-muted">{voicePreviewNotice}</p>}
            </div>
            <p className="text-sm leading-6 text-ink-muted">Escolha uma voz de leitura instalada no seu dispositivo. Os nomes e sotaques disponíveis variam por navegador e sistema operacional.</p>
            <label className="block text-sm font-semibold">Voz e sotaque
              <select aria-label="Selecionar voz do tutor" disabled={!selectedVoice} value={selectedVoice?.voiceURI??""}
                onChange={e=>setVoiceSettings(p=>({...p,voiceURI:e.target.value}))}
                className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal disabled:opacity-50">
                {!selectedVoice?<option value="">Nenhuma voz local encontrada</option>:availableLocalVoices(voices).map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.lang} — {v.name}</option>)}
              </select>
            </label>
            {!selectedVoice&&<p role="status" className="text-sm text-ink-muted">Este navegador não disponibiliza vozes locais. A conversa por texto continua funcionando.</p>}
            <label className="block text-sm font-semibold">Timbre — mais grave / mais agudo ({voiceSettings.pitch.toFixed(2)})
              <input type="range" min="0.8" max="1.2" step="0.05" value={voiceSettings.pitch} onChange={e=>setVoiceSettings(p=>({...p,pitch:Number(e.target.value)}))} className="mt-2 w-full"/>
            </label>
            <label className="block text-sm font-semibold">Velocidade da fala ({voiceSettings.rate.toFixed(2)}×)
              <input type="range" min="0.75" max="1.15" step="0.05" value={voiceSettings.rate} onChange={e=>setVoiceSettings(p=>({...p,rate:Number(e.target.value)}))} className="mt-2 w-full"/>
            </label>
            <p className="text-xs leading-5 text-ink-muted">O navegador não informa de forma confiável se uma voz é masculina ou feminina; por isso exibimos os nomes reais disponíveis. A alteração de timbre pode soar diferente conforme a voz escolhida. Essa leitura não avalia pronúncia.</p>
          </div>
          <details className="border-t border-ink/10 pt-4">
            <summary className="cursor-pointer text-sm font-semibold">Privacidade e opções avançadas</summary>
            <label className="mt-3 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" checked={allowAIFeedback} onChange={e=>setAllowAIFeedback(e.target.checked)}/>
              <span>Autorizar feedback opcional da OpenAI nas atividades iniciais, apenas se esse provedor estiver habilitado e com créditos. Isso não afeta as conversas atuais com Groq.</span>
            </label>
            <p className="mt-2 text-xs text-ink-muted">O envio de conversas ao Groq é autorizado separadamente quando você conversa pela primeira vez. Você pode revogar essa autorização nas configurações do chat.</p>
          </details>
          <p className="text-xs text-ink-muted">Idiomas desta primeira versão: interface pt-BR, explicação em português, aprendizado de inglês. O tom de conversa é independente da voz usada na leitura.</p>
          {preferences.error && <p role="alert" className="text-sm text-red-700">{preferences.error.message}</p>}
          {saved && <p role="status" className="text-sm text-teal">Preferências salvas.</p>}
          <button disabled={preferences.isPending || !tutorName.trim()} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">Salvar preferências</button>
        </form>
      </section>}
      {logout.error && <p role="alert" className="mt-5 text-sm text-red-700">Não foi possível sair. Tente novamente.</p>}
    </main>
    <TutorChat profile={profile} accountEmail={email} voiceSettings={voiceSettings} onVoiceSettingsChange={setVoiceSettings} onOpenTutorSettings={()=>setView("settings")}/>
  </div>;
}
