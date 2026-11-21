import { useEffect, useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";

const goalOptions = [
  { value: "work", label: "Inglês para trabalho" },
  { value: "travel", label: "Viagens" },
  { value: "everyday", label: "Conversas do dia a dia" },
  { value: "study", label: "Estudos" },
  { value: "other", label: "Outro objetivo" },
] as const;
const exposureOptions = [
  { value: "none", label: "Estou começando do zero" },
  { value: "some", label: "Já estudei um pouco" },
  { value: "comfortable", label: "Já consigo entender algumas frases" },
] as const;

function Quiz({
  questions,
  answers,
  onAnswer,
}: {
  questions: { id: string; prompt: string; choices: readonly string[] }[];
  answers: number[];
  onAnswer: (question: number, choice: number) => void;
}) {
  return <div className="space-y-7">
    {questions.map((question, index) => (
      <fieldset key={question.id} className="border-b border-ink/10 pb-6">
        <legend className="mb-3 text-sm font-semibold text-ink">
          {index + 1}. {question.prompt}
        </legend>
        <div className="grid gap-2">
          {question.choices.map((choice, option) => (
            <label key={option} className={"flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm " +
              (answers[index] === option ? "border-teal bg-teal/10" : "border-ink/10 bg-white")}>
              <input type="radio" name={question.id} value={option}
                checked={answers[index] === option} onChange={() => onAnswer(index, option)} />
              {choice}
            </label>
          ))}
        </div>
      </fieldset>
    ))}
  </div>;
}

export default function StudentWorkspace() {
  const status = trpc.student.status.useQuery(undefined, { retry: false });
  const authUtils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation();
  const create = trpc.student.createProfile.useMutation();
  const diagnostic = trpc.student.submitDiagnostic.useMutation();
  const lessonSubmit = trpc.student.submitLesson.useMutation();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState<(typeof goalOptions)[number]["value"]>("work");
  const [exposure, setExposure] = useState<(typeof exposureOptions)[number]["value"]>("none");
  const [baselineAnswers, setBaselineAnswers] = useState<number[]>(Array(6).fill(-1));
  const [lessonAnswers, setLessonAnswers] = useState<number[]>(Array(3).fill(-1));
  const [lessonFeedback, setLessonFeedback] = useState<string | null>(null);

  const data = status.data;
  const completed = new Set(data?.results.filter(result => result.completedAt).map(result => result.lessonKey) ?? []);
  const activeLesson = data?.lessons.find(lesson => !completed.has(lesson.key));
  const activeKey = activeLesson?.key;
  useEffect(() => {
    setLessonAnswers(Array(3).fill(-1));
    setLessonFeedback(null);
  }, [activeKey]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await create.mutateAsync({ displayName: name.trim(), studyGoal: goal, priorExposure: exposure });
      await status.refetch();
    } catch { /* safe API message shown next to form */ }
  };
  const saveBaseline = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await diagnostic.mutateAsync({ answers: baselineAnswers });
      await status.refetch();
    } catch { /* safe API message shown next to form */ }
  };
  const saveLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeLesson) return;
    try {
      const result = await lessonSubmit.mutateAsync({ lessonKey: activeLesson.key, answers: lessonAnswers });
      if (result.passed) await status.refetch();
      else setLessonFeedback("Você acertou " + result.score + " de " + result.total + ". Revise os exemplos e tente de novo. Nada foi marcado como concluído.");
    } catch { /* safe API message shown next to form */ }
  };

  return <div className="min-h-screen bg-paper text-ink">
    <header className="border-b border-ink/10 bg-white px-5 py-4 sm:px-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="font-display text-3xl">lingua<span className="text-teal">/</span></p>
          <p className="text-xs text-ink-muted">Meu espaço de aprendizagem</p>
        </div>
        <button type="button" className="text-sm font-semibold text-teal hover:underline" disabled={logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync();
              await authUtils.auth.me.invalidate();
              window.location.assign("/");
            } catch { /* keep session if logout request fails */ }
          }}>
          Sair da conta
        </button>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      {status.isPending && <p role="status">Carregando seu espaço pessoal...</p>}
      {status.isError && <section className="border border-ink/10 bg-white p-7 space-y-4">
        <h1 className="font-display text-3xl">Seu espaço está temporariamente indisponível</h1>
        <p className="text-sm text-ink-muted">Não conseguimos consultar os dados da sua conta. Nenhum progresso de demonstração foi atribuído a você.</p>
        <button type="button" className="bg-ink px-5 py-3 text-white" onClick={() => void status.refetch()}>Tentar novamente</button>
      </section>}
      {data && !data.profile && <section className="space-y-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal">Primeiro acesso · etapa 1 de 3</p>
          <h1 className="font-display text-4xl sm:text-5xl">Vamos começar do zero.</h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">Esta é a sua conta, não a demonstração. Primeiro vamos conhecer seu objetivo; depois faremos uma avaliação inicial e começaremos a primeira aula.</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-5 border border-ink/10 bg-white p-6 sm:p-8">
          <label className="block text-sm font-semibold">Como podemos chamar você?
            <input required minLength={2} maxLength={80} autoComplete="given-name" value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Seu nome" className="mt-2 block w-full border border-ink/20 bg-white p-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold">Seu principal objetivo
            <select value={goal} onChange={event => setGoal(event.target.value as typeof goal)}
              className="mt-2 block w-full border border-ink/20 bg-white p-3 font-normal">
              {goalOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">Seu contato anterior com inglês
            <select value={exposure} onChange={event => setExposure(event.target.value as typeof exposure)}
              className="mt-2 block w-full border border-ink/20 bg-white p-3 font-normal">
              {exposureOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {create.error && <p role="alert" className="text-sm text-red-700">{create.error.message}</p>}
          <button disabled={create.isPending || name.trim().length < 2} className="w-full bg-ink p-4 font-semibold text-white disabled:opacity-50">
            {create.isPending ? "Salvando..." : "Salvar perfil e continuar"}
          </button>
        </form>
      </section>}

      {data?.profile && !data.profile.baselineCompletedAt && <section className="space-y-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal">Primeiro acesso · etapa 2 de 3</p>
          <h1 className="font-display text-4xl sm:text-5xl">Seu ponto de partida.</h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">Olá, {data.profile.displayName}. Responda ao que souber. Esta é uma triagem diagnóstica simples, não uma prova, certificação ou evidência de domínio. Todos começam pela primeira lição.</p>
        </div>
        <form onSubmit={saveBaseline} className="space-y-6 border border-ink/10 bg-white p-6 sm:p-8">
          <Quiz questions={data.diagnostic} answers={baselineAnswers}
            onAnswer={(q, choice) => setBaselineAnswers(old => old.map((v, i) => i === q ? choice : v))} />
          {diagnostic.error && <p role="alert" className="text-sm text-red-700">{diagnostic.error.message}</p>}
          <button disabled={diagnostic.isPending || baselineAnswers.some(choice => choice < 0)}
            className="w-full bg-ink p-4 font-semibold text-white disabled:opacity-50">
            {diagnostic.isPending ? "Registrando..." : "Registrar diagnóstico e iniciar curso"}
          </button>
        </form>
      </section>}

      {data?.profile?.baselineCompletedAt && <section className="space-y-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal">Sua jornada · etapa 3 de 3</p>
          <h1 className="font-display text-4xl sm:text-5xl">Vamos aprender, {data.profile.displayName}.</h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted">Seu curso começa na primeira lição. Somente exercícios realmente concluídos entram no seu progresso pessoal.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-ink/10 bg-white p-4">
            <p className="text-xs text-ink-muted">Diagnóstico inicial</p>
            <p className="mt-2 font-display text-3xl">{data.profile.baselineScore} / {data.profile.baselineTotal}</p>
            <p className="text-xs text-ink-muted">Indicativo, sem certificação</p>
          </div>
          <div className="border border-ink/10 bg-white p-4">
            <p className="text-xs text-ink-muted">Aulas concluídas</p>
            <p className="mt-2 font-display text-3xl">{completed.size} / {data.lessons.length}</p>
            <p className="text-xs text-ink-muted">Resultados salvos na conta</p>
          </div>
          <div className="border border-ink/10 bg-white p-4">
            <p className="text-xs text-ink-muted">Sua trilha</p>
            <p className="mt-2 text-sm font-semibold">Fundamentos do inglês</p>
            <p className="mt-2 text-xs text-ink-muted">Início pela base, sem pular etapas</p>
          </div>
        </div>
        <div className="space-y-3">
          {data.lessons.map((lesson, index) => <div key={lesson.key}
            className={"flex items-center justify-between border px-5 py-4 " +
              (completed.has(lesson.key) ? "border-teal/30 bg-teal/5" : lesson.key === activeKey ? "border-ink/20 bg-white" : "border-ink/10 bg-paper")}>
            <div>
              <p className="text-sm font-semibold">{lesson.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{lesson.objective}</p>
            </div>
            <span className="ml-3 shrink-0 text-xs font-semibold text-teal">
              {completed.has(lesson.key) ? "Concluída" : lesson.key === activeKey ? "Agora" : index > 0 ? "Depois" : "A seguir"}
            </span>
          </div>)}
        </div>
        {activeLesson ? <section className="space-y-6 border border-ink/10 bg-white p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Sua aula atual</p>
            <h2 className="mt-2 font-display text-3xl">{activeLesson.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">{activeLesson.explanation}</p>
          </div>
          <div className="space-y-3 border-l-2 border-teal pl-4">
            {activeLesson.examples.map(example => <div key={example.en}>
              <p className="font-semibold">{example.en}</p>
              <p className="text-sm text-ink-muted">{example.pt}</p>
            </div>)}
          </div>
          <form onSubmit={saveLesson} className="space-y-5">
            <h3 className="font-semibold">Pratique e confira o que aprendeu</h3>
            <Quiz questions={activeLesson.questions} answers={lessonAnswers}
              onAnswer={(q, choice) => { setLessonFeedback(null); setLessonAnswers(old => old.map((v, i) => i === q ? choice : v)); }} />
            {lessonFeedback && <p role="status" className="text-sm text-ink">{lessonFeedback}</p>}
            {lessonSubmit.error && <p role="alert" className="text-sm text-red-700">{lessonSubmit.error.message}</p>}
            <button disabled={lessonSubmit.isPending || lessonAnswers.some(choice => choice < 0)}
              className="w-full bg-ink p-4 font-semibold text-white disabled:opacity-50">
              {lessonSubmit.isPending ? "Conferindo..." : "Corrigir respostas"}
            </button>
            <p className="text-xs text-ink-muted">Concluímos uma aula após acertar suas três questões. Seus acertos são registrados como exercícios, não como certificação de competência.</p>
          </form>
        </section> : <div className="border border-ink/10 bg-white p-8">
          <h2 className="font-display text-3xl">Você concluiu os fundamentos disponíveis!</h2>
          <p className="mt-3 text-sm text-ink-muted">As três lições iniciais estão registradas na sua conta. Novas unidades dependerão de validação curricular; não vamos inventar progresso nem certificados.</p>
        </div>}
      </section>}
    </main>
  </div>;
}
