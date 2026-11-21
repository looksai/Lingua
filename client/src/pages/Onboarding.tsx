import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  firstAccessTasks, interestLabels, tutorPersonaLabels,
  supportedFirstAccessLanguages,
  type LearnerInterest, type TutorPersona,
} from "@shared/onboarding";

type Snapshot = NonNullable<ReturnType<typeof trpc.onboarding.me.useQuery>["data"]>;

export default function Onboarding({ snapshot }: { snapshot: Snapshot }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("Seu tutor");
  const [persona, setPersona] = useState<TutorPersona>("welcoming");
  const [interest, setInterest] = useState<LearnerInterest>("curiosity");
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

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...supportedFirstAccessLanguages, tutorName: name.trim(), tutorPersona: persona, interest,
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
    <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <span className="font-display text-3xl">lingua<span className="text-teal">/</span></span>
          <span className="text-xs uppercase tracking-widest text-ink-muted">
            {profile ? "Uma conversa para começar" : "Seu primeiro acesso"}
          </span>
        </header>
        {!profile ? (
          <form onSubmit={createProfile} className="space-y-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-10">
            <p className="text-sm font-semibold text-teal">Olá! Que bom ter você aqui.</p>
            <h1 className="font-display text-4xl leading-tight">Vamos criar o seu espaço?</h1>
            <p className="text-sm leading-6 text-ink-muted">Você poderá mudar o nome e o estilo do tutor depois. Nenhum nível de inglês será presumido.</p>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Idiomas iniciais</legend>
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
            <p className="text-xs leading-5 text-ink-muted">Vamos guardar as escolhas e as respostas da triagem na sua conta para você poder continuar depois. Não usaremos essas respostas para treinar modelos de IA por esta escolha.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}
            <button disabled={busy || !name.trim()} className="w-full rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Salvando..." : "Conhecer meu tutor"}
            </button>
          </form>
        ) : (
          <div className="space-y-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-teal">{profile.tutorName}</span>
              <span className="text-ink-muted">Etapa {Math.min(currentPosition + 1, firstAccessTasks.length)} de {firstAccessTasks.length}</span>
            </div>
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
                <div className="rounded-xl border border-teal/20 bg-teal/5 p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal">Pergunta {currentPosition + 1}</p>
                  <p className="text-base leading-7">{nextTask.message}</p>
                </div>
                <label className="block text-sm font-semibold">Sua resposta
                  <textarea required maxLength={1000} rows={4} value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Pode tentar, mesmo sem ter certeza." className="mt-2 w-full resize-y rounded-xl border border-ink/15 bg-paper p-4 font-normal" />
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}
                <button disabled={busy || !answer.trim()} className="w-full rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-50">
                  {submit.isPending ? "Registrando..." : "Responder e continuar"}
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
