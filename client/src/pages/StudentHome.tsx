import "./academy-landing.css";
import "./academy-interior.css";
import "./academy-premium.css";
import "./academy-campus.css";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, ListChecks, LogOut, MessageSquare, Settings2, ArrowRight, Compass, Globe2, GraduationCap, Target, ChevronRight, Trophy, BriefcaseBusiness, Plane, Users, Newspaper, Video, Search, Crown } from "lucide-react";
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
  const [tutorOpenRequest,setTutorOpenRequest]=useState(0);
  const [search,setSearch]=useState("");
  const [notice,setNotice]=useState("");
  const sponsors=trpc.campus.sponsors.useQuery(undefined,{enabled:view==="dashboard",retry:false});
  const areas=[{label:"Idiomas",description:"Prática real de inglês.",icon:BookOpen,asset:"idiomas",action:()=>setView("read")},{label:"Exames",description:"Preparação para exames de proficiência.",icon:Trophy,asset:"exames"},{label:"Empregos Globais",description:"Carreira e oportunidades internacionais.",icon:BriefcaseBusiness,asset:"empregos"},{label:"Imigração",description:"Planejamento da sua mudança.",icon:Plane,asset:"imigracao"},{label:"Consultorias",description:"Orientação profissional especializada.",icon:Users,asset:"consultorias"}];
  const unavailable=(label:string)=>setNotice(label+" — área em preparação. Ainda não está disponível.");
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
    const version=speechCapabilities.data?.memory?2:1;
    const key=`lingua:provider-consent:v${version}:${email.trim().toLowerCase()}:groq`;
    let accepted=false;
    try{const raw=JSON.parse(window.localStorage.getItem(key)??"null") as {accepted?:boolean;version?:number}|null;
      accepted=raw?.accepted===true&&raw.version===version;}catch{/* prompt required */}
    if(!accepted){setVoicePreviewNotice("Antes de testar, abra a conversa com o tutor e autorize o envio ao Groq.");return;}
    const chosen=voiceSettings.neuralVoice??"troy";
    try{
      const result=await neuralPreview.mutateAsync({consent:true,provider:"groq",voice:chosen,
        text:"Hello! I am your English tutor. Let us practice together."});
      setVoicePreviewAudio(result.audioBase64);
    }catch(error){
      const code=(error as {data?:{code?:string}})?.data?.code;
      const message=(error as {message?:unknown})?.message;
      const diagnosed=typeof message==="string"&&message.startsWith("Groq recusou a voz neural (HTTP 400):")&&message.length<=180;
      setVoicePreviewNotice(code==="TOO_MANY_REQUESTS"?"O limite gratuito de voz foi atingido. Tente novamente após a renovação da cota.":
        diagnosed?message:"Erro ao gerar voz neural do Groq. O navegador não substituiu automaticamente pelo Orpheus.");
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
  const placement=trpc.placement.me.useQuery(undefined,{retry:false});
  const [requestPlacement,setRequestPlacement]=useState(false);
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

  return <div className="academy-student academy-interior academy-premium academy-campus">
    <header className="academy-topbar academy-premium-topbar">
      <div className="academy-topbar-inner">
        <img className="academy-student-logo" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua" />
        <form className="academy-campus-search" role="search" onSubmit={e=>{e.preventDefault();setView("dashboard");}}><Search size={17} aria-hidden="true"/><input aria-label="Buscar áreas do Lingua" placeholder="Buscar áreas do Lingua..." value={search} onChange={e=>setSearch(e.target.value)}/></form><div className="academy-premium-account"><span>Minha conta</span><strong>{email}</strong></div>
        <button onClick={signOut} disabled={logout.isPending} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted"><LogOut size={16}/> Sair</button>
      </div>
    </header>
    <nav aria-label="Meu espaço" className="academy-route-nav academy-premium-nav"><div className="academy-rail-heading"><Globe2 size={19} aria-hidden="true"/> <span>MEU ESPAÇO</span></div>
      {([
        ["dashboard", Compass, "Meu início"],
        ["read", BookOpen, "Ler e praticar"],
        ["review", ListChecks, "Revisar"],
        ["settings", Settings2, "Meu tutor"],
      ] as const).map(([id, Icon, label]) => (
        <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}><Icon size={16}/>{label}</button>
      ))}
      {[{label:"Exames",Icon:Trophy},{label:"Empregos",Icon:BriefcaseBusiness},{label:"Imigração",Icon:Plane},{label:"Consultorias",Icon:Users},{label:"Comunidade",Icon:Users},{label:"Lives e Eventos",Icon:Video},{label:"Notícias Globais",Icon:Newspaper}].map(({label,Icon})=><button key={label} type="button" onClick={()=>unavailable(label)}><Icon size={17} aria-hidden="true"/>{label}<small>Em breve</small></button>)}
      <button type="button" className="academy-rail-chat" onClick={()=>setTutorOpenRequest(n=>n+1)}><MessageSquare size={18} aria-hidden="true"/> Conversar com o tutor</button>
      <div className="academy-campus-membership"><Crown size={23} aria-hidden="true"/><strong>Seu acesso</strong><p>Consulte seu período de acesso no aviso da conta. Planos comerciais em preparação.</p></div><div className="academy-rail-note"><Globe2 size={22} aria-hidden="true"/><span>Inglês para o seu próximo passo.</span></div>
    </nav>
    <main key={view} className="academy-view-enter academy-premium-main">
      {notice&&<div role="status" className="academy-campus-notice">{notice}<button type="button" onClick={()=>setNotice("")} aria-label="Fechar aviso">×</button></div>}
      {view === "dashboard" && <div className="academy-dashboard-v3">
        
        <section className="academy-welcome academy-premium-hero">
          <div className="academy-hero-editorial"><p className="academy-kicker"><span/> BEM-VINDO(A) À LINGUA</p>
            <h1>Aprenda, conquiste oportunidades e conecte-se <em>com o mundo.</em></h1>
            <p>Idiomas, preparação para exames, empregos internacionais, imigração e consultorias em um só lugar.</p>
            <button className="academy-primary" onClick={()=>setView("read")}>Continuar meus estudos <ArrowRight size={18} aria-hidden="true"/></button>
          </div>
          
        </section>
        <div className="academy-campus-areas" aria-label="Áreas da plataforma">{areas.filter(a=>!search.trim()|| (a.label+" "+a.description).toLowerCase().includes(search.trim().toLowerCase())).map(({label,description,icon:Icon,asset,action})=><button type="button" className={"academy-campus-area area-"+asset} key={asset} onClick={action??(()=>unavailable(label))}><Icon size={27} aria-hidden="true"/><h2>{label}</h2><p>{description}</p>{!action&&<small>Em preparação</small>}</button>)}{!areas.some(a=>!search.trim()||(a.label+" "+a.description).toLowerCase().includes(search.trim().toLowerCase()))&&<p>Nenhuma área encontrada.</p>}</div>
        <div className="academy-dashboard-grid">
          <section className="academy-dashboard-plan">
            <div className="academy-section-heading"><div><p className="academy-kicker">MEU PLANO</p><h2>Meu Plano de Estudos</h2></div><Target size={24} aria-hidden="true"/></div>
            <div className="academy-plan-focus">
              <p className="academy-kicker">{placement.data?.plan?"PLANO DE QUATRO SEMANAS · PROVISÓRIO":"PLANO INICIAL · EXPLORATÓRIO"}</p>
              <h3>{placement.data?.plan?.title??plan.title}</h3>
              {placement.data?.plan?<div className="academy-plan-timeline">{placement.data.plan.weeks.map(w=><div key={w.week}><span>{String(w.week).padStart(2,"0")}</span><div><strong>{w.goal}</strong><p>{w.practice}</p><small>Como conferir: {w.check}</small></div></div>)}</div>:<><p>{plan.objective}</p><p className="academy-plan-context">Contexto: {plan.context}</p></>}
              {placement.data?.plan?<details className="academy-plan-details"><summary>Sobre este plano</summary><p>Sugestões a partir de três amostras de texto, não uma avaliação CEFR.</p><strong>Pistas a verificar</strong>{placement.data.plan.observations.map((v,i)=><p key={i}>{v}</p>)}<strong>Próximas verificações</strong>{placement.data.plan.nextChecks.map((v,i)=><p key={i}>{v}</p>)}</details>:<details className="academy-plan-details"><summary>Como o plano foi escolhido</summary><p>{plan.reason} {plan.limits}</p></details>}
            </div>
            {placement.data&&!placement.data.plan&&<button type="button" onClick={()=>setRequestPlacement(v=>!v)} className="academy-dashboard-link">Descobrir por onde começar — 3 perguntas <ChevronRight size={16} aria-hidden="true"/></button>}
            {placement.isError&&<p className="text-sm text-ink-muted">A sondagem não está disponível neste momento.</p>}
          </section>
          <aside className="academy-dashboard-tutor">
            <div className="academy-tutor-monogram"><MessageSquare size={30} aria-hidden="true"/><span>AI</span></div>
            <p className="academy-kicker">02 / SEU TUTOR</p>
            <h2>{profile.tutorName}</h2>
            <p>Pratique, tire dúvidas e descubra seu próximo desafio.</p>
            <button className="academy-tutor-action" onClick={()=>setTutorOpenRequest(n=>n+1)}>Abrir conversa <ArrowRight size={17} aria-hidden="true"/></button>
            <button className="academy-tutor-settings-link" onClick={()=>setView("settings")}>Personalizar tutor <Settings2 size={15} aria-hidden="true"/></button>
          </aside>
          <section className="academy-dashboard-progress">
            <div className="academy-section-heading"><div><p className="academy-kicker">03 / SEU PROGRESSO</p><h2>Pequenos passos. Avanço real.</h2></div><GraduationCap size={26} aria-hidden="true"/></div>
            <div className="academy-progress-layout"><div className="academy-progress-ring" role="progressbar" aria-label="Respostas registradas na triagem" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(recorded,5)} style={{background:`conic-gradient(#F5A623 ${Math.min(recorded,5)*20}%,#e5eaf0 0)`}}><span><strong>{recorded}<small>/5</small></strong><small>respostas</small></span></div><div><h3>Conversa inicial</h3><p>{recorded===0?"Seu ponto de partida ainda está por descobrir.":"Respostas de leitura e escrita registradas."}</p><small>Não é uma nota de proficiência.</small>{deferred&&<button onClick={resumeDiagnostic} disabled={resume.isPending} className="academy-dashboard-link">Retomar conversa inicial <ChevronRight size={16} aria-hidden="true"/></button>}{resume.error&&<p role="alert" className="text-sm text-red-700">{resume.error.message}</p>}</div></div>
          </section>
          <section className="academy-dashboard-library">
            <p className="academy-kicker">04 / SUA BIBLIOTECA</p><ListChecks size={24} aria-hidden="true"/>
            <strong className="academy-library-number">{items.isError||items.isLoading?"—":items.data?.length??0}</strong>
            <h2>Itens salvos</h2><p>Seu vocabulário e frases para retomar no momento certo.</p>
            <button className="academy-dashboard-link" onClick={()=>setView("review")}>Minhas revisões <ChevronRight size={17} aria-hidden="true"/></button>
          </section>
        </div>
        <div className="academy-campus-editorial"><section className="campus-event"><p className="academy-kicker">LIVES & EVENTOS</p><h2>Aprenda com especialistas</h2><p>Nenhum evento divulgado por enquanto.</p></section><section className="campus-community"><p className="academy-kicker">COMUNIDADE LINGUA</p><h2>Conecte-se com o mundo</h2><p>Comunidade exclusiva em preparação.</p></section><section className="campus-news"><p className="academy-kicker">NOTÍCIAS GLOBAIS</p><h2>O mundo em perspectiva</h2><p>Curadoria editorial em preparação.</p></section></div>
        <section className="academy-campus-sponsors" aria-label="Destaques patrocinados"><div className="academy-section-heading"><div><p className="academy-kicker">ESPAÇO COMERCIAL</p><h2>Destaques patrocinados</h2></div></div><p>Publicidade de parceiros, separada das recomendações de estudo.</p>{sponsors.isPending?<p>Carregando destaques...</p>:sponsors.isError?<p>Os destaques estão indisponíveis.</p>:sponsors.data?.length?<div className="academy-sponsor-grid">{sponsors.data.map(c=><article key={c.id}><small>Patrocinado · {c.sponsor}</small><h3>{c.title}</h3><p>{c.description}</p><a href={c.url} target="_blank" rel="noopener noreferrer sponsored">Conhecer o parceiro <ArrowRight size={15}/></a></article>)}</div>:<p className="academy-sponsor-empty">Nenhum destaque patrocinado publicado.</p>}</section>
      </div>}
      {view === "read" && <>
        
        <ReadingLab/>
      </>}
      {view === "review" && <>
        
        <ReviewDeck/>
      </>}
      {view === "settings" && <div className="academy-settings-layout"><section className="academy-settings-intro"><div className="academy-settings-avatar"><MessageSquare size={35} aria-hidden="true"/></div><p className="eyebrow">Seu tutor pessoal</p><h1 className="font-display text-4xl">{profile.tutorName}</h1><p>Uma experiência de aprendizado que acompanha seu ritmo. Personalize a conversa, a voz e suas preferências.</p><div className="academy-settings-meta"><span>Estilo de conversa</span><strong>{tutorPersonaLabels[profile.tutorPersona]}</strong><span>Interesse atual</span><strong>{interestLabels[profile.interest]}</strong></div></section><section className="academy-settings-form rounded-2xl border border-ink/10 bg-white p-5 sm:p-7">
        <h2 className="font-display text-3xl">Personalize seu tutor</h2>
        <p className="mt-3 mb-6 text-sm text-ink-muted">Você pode mudar o nome e o tom sempre que quiser.</p>
        <form onSubmit={savePreferences} className="space-y-5">
          <label className="block text-sm font-semibold">Nome<input required maxLength={40} value={tutorName} onChange={e => setTutorName(e.target.value)} className="mt-2 w-full rounded-lg border p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Tom<select value={tutorPersona} onChange={e=>setTutorPersona(e.target.value as TutorPersona)} className="mt-2 w-full rounded-lg border p-3 font-normal">{Object.entries(tutorPersonaLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block text-sm font-semibold">Interesse<select value={interest} onChange={e=>setInterest(e.target.value as LearnerInterest)} className="mt-2 w-full rounded-lg border p-3 font-normal">{Object.entries(interestLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <div className="academy-voice-panel space-y-4 border-t border-ink/10 pt-5">
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
                className="academy-secondary mt-3 text-sm">
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
          <div className="academy-settings-save"><button disabled={preferences.isPending || !tutorName.trim()} className="academy-primary">{preferences.isPending?"Salvando…":"Salvar preferências"}</button></div>
        </form>
      </section></div>}
      {logout.error && <p role="alert" className="mt-5 text-sm text-red-700">Não foi possível sair. Tente novamente.</p>}
    </main>
    <TutorChat initialOpen={false} openRequest={tutorOpenRequest} profile={profile} accountEmail={email} voiceSettings={voiceSettings} onVoiceSettingsChange={setVoiceSettings} onOpenTutorSettings={()=>setView("settings")} placementRequested={requestPlacement} onPlacementCompleted={()=>{setRequestPlacement(false);void placement.refetch();setView("dashboard");}}/>
  </div>;
}
