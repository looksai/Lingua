import "./academy-landing.css";
import "./academy-interior.css";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useState, type FormEvent } from "react";
import { Globe2, MessageCircle, Compass, ArrowRight, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  firstAccessTasks, interestLabels, tutorPersonaLabels,
  supportedFirstAccessLanguages,
  type LearnerInterest, type TutorPersona,
} from "@shared/onboarding";

type Snapshot = inferRouterOutputs<AppRouter>["onboarding"]["me"];

export default function Onboarding({ snapshot }: { snapshot: Snapshot }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("Seu tutor");
  const [persona, setPersona] = useState<TutorPersona>("welcoming");
  const [interest, setInterest] = useState<LearnerInterest>("curiosity");
  const [allowAIFeedback, setAllowAIFeedback] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastReply, setLastReply] = useState("");
  const save = trpc.onboarding.saveProfile.useMutation();
  const submit = trpc.onboarding.submit.useMutation();
  const defer = trpc.onboarding.defer.useMutation();
  const busy = save.isPending || submit.isPending || defer.isPending;
  const error = save.error ?? submit.error ?? defer.error;
  const profile = snapshot.profile;
  const replies = snapshot.responses;
  const nextTask = snapshot.nextTask;
  const currentPosition = replies.length;

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...supportedFirstAccessLanguages, tutorName: name.trim(), tutorPersona: persona, interest, allowAIFeedback,
      });
      await utils.onboarding.me.invalidate();
    } catch { /* UI below shows the error */ }
  }

  async function sendAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextTask || !answer.trim()) return;
    try {
      const result = await submit.mutateAsync({ taskId: nextTask.id, answer: answer.trim() });
      setLastReply(result.tutorReply);
      setAnswer("");
      await utils.onboarding.me.invalidate();
    } catch { /* UI below shows the error */ }
  }

  async function goToDashboard() {
    try {
      await defer.mutateAsync();
      await utils.onboarding.me.invalidate();
    } catch { /* UI below shows the error */ }
  }

  return (
    <main className="academy-student academy-interior">
      <header className="academy-topbar"><div className="academy-topbar-inner">
          <img className="academy-student-logo" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua" />
          <span className="text-xs uppercase tracking-widest text-ink-muted">
            {profile ? "Uma conversa para começar" : "Seu primeiro acesso"}
          </span>
        </div></header>
      <div className="academy-onboarding-shell">
        <aside className="academy-onboarding-art"><div className="academy-onboarding-route" aria-label="Etapas do primeiro acesso"><div data-current={!profile}><span>{profile?<Check size={15}/>:<Compass size={15}/>}</span><strong>Seu perfil</strong></div><div data-current={Boolean(profile)}><span><MessageCircle size={15}/></span><strong>Conversa inicial</strong></div></div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#ffda65]">Seu próximo passo</p><h2 className="font-display text-3xl sm:text-4xl">O mundo começa com uma conversa.</h2><p className="mt-3 text-sm leading-6">Vamos construir um caminho de aprendizagem que faça sentido para você.</p></aside>
        {!profile ? (
          <form onSubmit={createProfile} className="academy-onboarding-card space-y-6 border bg-white p-5 sm:p-8">
            <p className="text-sm font-semibold text-teal">Olá! Que bom ter você aqui.</p>
            <h1 className="font-display text-4xl leading-tight">Vamos criar o seu espaço?</h1>
            <p className="text-sm leading-6 text-ink-muted">Você poderá mudar o nome e o estilo do tutor depois. Nenhum nível de inglês será presumido.</p>
            <fieldset className="academy-language-panel space-y-2">
              <legend className="text-sm font-semibold"><Globe2 size={16} className="mr-2 inline" aria-hidden="true"/>Idiomas iniciais</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-ink-muted">Interface
                  <select value="pt-BR" disabled className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="pt-BR">Português (Brasil)</option></select>
                </label>
                <label className="text-xs text-ink-muted">Idioma de apoio
                  <select value="pt" disabled className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="pt">Português</option></select>
                </label>
                <label className="text-xs text-ink-muted">Quero aprender
                  <select value="en" disabled className="mt-1 w-full rounded-lg border p-3 text-sm"><option value="en">Inglês</option></select>
                </label>
              </div>
              <p className="text-xs text-ink-faint">Este primeiro lançamento oferece português → inglês. Outros pares chegarão após validação.</p>
            </fieldset>
            <label className="block text-sm font-semibold">Como você quer chamar seu tutor?
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40} minLength={1} required
                placeholder="Ex.: Alex, Nina, Meu tutor" className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Como ele deve conversar?
              <select value={persona} onChange={e => setPersona(e.target.value as TutorPersona)}
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-4 py-3 font-normal">
                {Object.entries(tutorPersonaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">O que despertou sua curiosidade?
              <select value={interest} onChange={e => setInterest(e.target.value as LearnerInterest)}
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-4 py-3 font-normal">
                {Object.entries(interestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <p className="text-xs leading-5 text-ink-muted">Vamos guardar as escolhas e as respostas da triagem na sua conta para você continuar depois. Elas não serão usadas por nós para treinar modelos.</p>
            <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1" checked={allowAIFeedback} onChange={e=>setAllowAIFeedback(e.target.checked)}/><span>Quero feedback curto com IA durante a triagem. Ao ativar, minha resposta textual e a pergunta serão enviadas à API da OpenAI para processar o feedback. Posso deixar desativado e continuar normalmente.</span></label>
            {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}
            <button disabled={busy || !name.trim()} className="academy-primary w-full">
              {busy ? "Salvando..." : "Conhecer meu tutor"} <ArrowRight size={17} aria-hidden="true"/>
            </button>
          </form>
        ) : (
          <div className="academy-onboarding-card space-y-6 border bg-white p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="academy-diagnostic-tutor"><MessageCircle size={20} aria-hidden="true"/><span>{profile.tutorName}</span></span>
              <span className="text-ink-muted">Etapa {Math.min(currentPosition + 1, firstAccessTasks.length)} de {firstAccessTasks.length}</span>
            </div>
            <div className="academy-steps" role="progressbar" aria-label="Respostas da conversa inicial" aria-valuemin={0} aria-valuemax={firstAccessTasks.length} aria-valuenow={Math.min(currentPosition,firstAccessTasks.length)}>{firstAccessTasks.map((task,index)=><span key={task.id} data-complete={index<currentPosition}/>)}</div>
            {currentPosition === 0 && !lastReply && (
              <div className="rounded-xl bg-paper p-5 text-sm leading-6">
                Oi! Você pode me chamar de <strong>{profile.tutorName}</strong>. Quero conhecer como você usa o inglês — sem provas longas e sem julgamentos. Podemos começar por texto?
              </div>
            )}
            {lastReply && <div className="rounded-xl bg-paper p-5 text-sm leading-6" aria-live="polite">{lastReply}</div>}
            <h1 className="font-display text-4xl leading-tight">Uma descoberta de cada vez.</h1>
            <p className="text-sm text-ink-muted">Esta é uma triagem curta por texto, não uma avaliação completa. A fala e a escuta ainda não serão avaliadas.</p>
            {nextTask ? (
              <form onSubmit={sendAnswer} className="space-y-5">
                <div className="academy-diagnostic-question rounded-xl border border-teal/20 p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal">Pergunta {currentPosition + 1}</p>
                  <p className="text-base leading-7">{nextTask.message}</p>
                </div>
                <label className="block text-sm font-semibold">Sua resposta
                  <textarea required maxLength={1000} rows={4} value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Pode tentar, mesmo sem ter certeza." className="mt-2 w-full resize-y rounded-xl border border-ink/15 bg-paper p-4 font-normal" />
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}
                <button disabled={busy || !answer.trim()} className="academy-primary w-full">
                  {submit.isPending ? "Registrando..." : "Responder e continuar"} <ArrowRight size={17} aria-hidden="true"/>
                </button>
              </form>
            ) : <p className="text-sm">Suas respostas foram registradas. O plano inicial será provisório até avaliarmos mais habilidades.</p>}
            <button type="button" disabled={busy} onClick={goToDashboard} className="text-sm font-semibold text-teal underline disabled:opacity-50">
              Prefiro explorar o aplicativo agora
            </button>
            <p className="text-xs text-ink-faint">As respostas são guardadas na sua conta. Você poderá retomar depois se pausar.</p>
          </div>
        )}
      </div>
    </main>
  );
}
