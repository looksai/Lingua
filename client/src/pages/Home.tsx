import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  ExternalLink,
  Film,
  Flag,
  Gauge,
  Headphones,
  Info,
  Layers3,
  Library,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import "./academy-interior.css";
import type { EngineDecision, EvidenceKind } from "@/lib/csle-contract";
import { mockDecision } from "@/lib/csle-contract";
import ReadingLab from "@/components/ReadingLab";
import ContentLibrary from "@/components/ContentLibrary";
import ReviewDeck from "@/components/ReviewDeck";
import { trpc } from "@/lib/trpc";

type View = "home" | "learn" | "read" | "review" | "explore" | "evidence";

const navItems: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: "home", label: "Início", icon: Compass },
  { id: "learn", label: "Aprender", icon: BookOpen },
  { id: "read", label: "Ler", icon: Library },
  { id: "review", label: "Revisar", icon: ListChecks },
  { id: "explore", label: "Explorar", icon: Sparkles },
  { id: "evidence", label: "Evidências", icon: TrendingUp },
];

const anchors = [
  { label: "Pronouns", state: "done" },
  { label: "am / is / are", state: "current" },
  { label: "Questions", state: "next" },
  { label: "Past tense", state: "locked" },
];

const evidenceRows: {
  label: string;
  kind: EvidenceKind;
  value: number;
  note: string;
  status: "simulated" | "hypothesis" | "implemented";
}[] = [
  {
    label: "Reconhecimento",
    kind: "recognition",
    value: 92,
    note: "Identifica a forma correta",
    status: "simulated",
  },
  {
    label: "Compreensão",
    kind: "comprehension",
    value: 78,
    note: "Explica por que ela funciona",
    status: "simulated",
  },
  {
    label: "Recuperação",
    kind: "retrieval",
    value: 64,
    note: "Lembra sem dicas",
    status: "hypothesis",
  },
  {
    label: "Aplicação",
    kind: "application",
    value: 58,
    note: "Usa em uma frase própria",
    status: "hypothesis",
  },
  {
    label: "Transferência",
    kind: "transfer",
    value: 41,
    note: "Usa em cenário desconhecido",
    status: "hypothesis",
  },
];

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "coral" | "dark";
}) {
  const tones = {
    neutral: "border-ink/10 bg-white/60 text-ink-muted",
    teal: "border-teal/20 bg-teal/10 text-teal-deep",
    coral: "border-coral/25 bg-coral/10 text-coral-deep",
    dark: "border-ink/15 bg-ink text-paper",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.13em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="font-display text-4xl leading-[0.98] tracking-[-0.045em] text-ink sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function ProgressLine({
  value,
  color = "bg-teal",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden bg-ink/8">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function EvidenceTag({
  status,
}: {
  status: "simulated" | "hypothesis" | "implemented";
}) {
  const copy = {
    simulated: "simulado",
    hypothesis: "hipótese",
    implemented: "implementado",
  };
  const tone =
    status === "simulated"
      ? "teal"
      : status === "hypothesis"
        ? "coral"
        : "neutral";
  return (
    <StatusPill tone={tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {copy[status]}
    </StatusPill>
  );
}

function AnchorRail({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`anchor-rail ${compact ? "py-3" : "py-4"}`}>
      {anchors.map((anchor, index) => (
        <div className="relative flex items-start gap-3" key={anchor.label}>
          <div className={`anchor-dot ${anchor.state}`}>
            <span>
              {anchor.state === "done" ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                index + 1
              )}
            </span>
          </div>
          <div className={compact ? "pt-0.5" : "pt-0.5"}>
            <p
              className={`text-sm font-semibold ${anchor.state === "current" ? "text-ink" : "text-ink-muted"}`}
            >
              {anchor.label}
            </p>
            {!compact && (
              <p className="mt-1 text-xs text-ink-faint">
                {anchor.state === "done"
                  ? "concluído"
                  : anchor.state === "current"
                    ? "agora"
                    : anchor.state === "next"
                      ? "próximo"
                      : "pré-requisito"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Shell({
  view,
  onNavigate,
  children,
  accountEmail,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
  accountEmail?: string;
}) {
  return (
    <div className="academy-interior academy-demo-layout">
      <aside className="academy-demo-sidebar academy-plain hidden w-[244px] flex-col border-r border-ink/10 px-6 py-7 lg:flex">
        <a href="/" aria-label="Voltar à home do Lingua"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/></a>
        <p className="mt-3 max-w-[170px] text-xs leading-5 text-ink-faint">
          Inglês que acompanha o seu caminho.
        </p>

        <nav className="mt-14 space-y-1.5">
          <p className="eyebrow mb-3 pl-3">Seu espaço</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={view === id ? "page" : undefined}
              className={`nav-item ${view === id ? "active" : ""}`}
            >
              <Icon size={17} strokeWidth={view === id ? 2.5 : 1.8} />
              <span>{label}</span>
              {id === "learn" && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="border border-ink/10 bg-[#F5F7FB] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Rota atual</span>
              <Target size={15} className="text-teal" />
            </div>
            <p className="text-sm font-semibold">Inglês profissional</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              3 de 8 âncoras visitadas
            </p>
            <div className="mt-3">
              <ProgressLine value={38} />
            </div>
          </div>
          <button className="mt-5 flex w-full items-center gap-3 border-t border-ink/10 pt-5 text-left">
            <div className="avatar">L</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{accountEmail ? "Minha conta" : "Visitante"}</p>
              <p className="text-xs text-ink-faint">{accountEmail ? "Conteúdo de exemplo" : "Explorar demonstração"}</p>
            </div>
            <Settings2 size={16} className="ml-auto text-ink-faint" />
          </button>
        </div>
      </aside>

      <div className="academy-demo-content">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-ink/10 bg-paper/95 px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <a className="lg:hidden" href="/" aria-label="Voltar à home do Lingua"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/></a>
          <div className="hidden items-center gap-2 text-xs text-ink-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" /> {accountEmail ? "conta conectada · conteúdo demonstrativo" : "sessão demonstrativa · progresso local"}
          </div>
          <div className="flex items-center gap-3">
            <button className="icon-button" aria-label="Ajuda">
              <CircleHelp size={17} />
            </button>
            {accountEmail ? <span className="text-xs text-teal" title={accountEmail}>Conta conectada</span> : <a href="/login" className="text-sm font-semibold text-teal hover:underline">Entrar / Cadastrar</a>}
          </div>
        </header>
        <main className="academy-demo-main mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          {children}
        </main>
      </div>

      <nav className="academy-demo-mobile fixed inset-x-0 bottom-0 z-20 flex border-t border-ink/10 px-2 py-2 backdrop-blur-md lg:hidden">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={view === id ? "page" : undefined}
            className={`mobile-nav-item ${view === id ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Seu espaço de aprendizagem</p>
          <h1 className="font-display text-5xl leading-[0.92] tracking-[-0.055em] sm:text-6xl">
            Bom te ver,
            <br />
            <span className="text-teal">por aqui.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-ink-muted">
            Seu caminho está salvo. Hoje, vamos transformar compreensão em uso —
            sem correr para a próxima coisa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone="teal">
            <Zap size={12} fill="currentColor" /> tutor ativo
          </StatusPill>
          <span className="text-xs text-ink-faint">
            última sessão há 2 dias
          </span>
        </div>
      </div>

      {!dismissed && (
        <section className="proactive-card relative overflow-hidden border border-teal/20 bg-[#EFF6FF] p-6 text-ink sm:p-8">
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full border border-teal/10" />
          <div className="absolute -right-4 -top-6 h-32 w-32 rounded-full border border-teal/10" />
          <button
            aria-label="Fechar sugestão"
            onClick={() => setDismissed(true)}
            className="absolute right-5 top-5 text-ink-muted/70 transition hover:text-ink"
          >
            <X size={17} />
          </button>
          <div className="relative z-[1] max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-deep">
              <Sparkles size={14} /> uma sugestão para agora
            </div>
            <h2 className="max-w-xl font-display text-3xl leading-tight tracking-[-0.035em] sm:text-4xl">
              Você já reconhece a estrutura. Vamos ver se ela sobrevive fora da
              oficina?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
              A próxima ação foi escolhida para observar transferência — ainda é
              uma hipótese, não um diagnóstico de domínio.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate("learn")}
                className="button-light"
              >
                Continuar a lição <ArrowRight size={15} />
              </button>
              <button
                onClick={() => onNavigate("explore")}
                className="button-quiet-light"
              >
                Explorar primeiro
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="border border-ink/10 bg-white/55 p-6 sm:p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Currículo comum · âncora 02</p>
              <h2 className="font-display text-3xl tracking-[-0.035em]">
                am / is / are
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Afirmações, negativas e perguntas em situações reais.
              </p>
            </div>
            <StatusPill tone="teal">
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> em
              andamento
            </StatusPill>
          </div>
          <div className="grid gap-8 md:grid-cols-[1fr_0.72fr] md:items-end">
            <div>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-muted">
                  cobertura da âncora
                </span>
                <span className="font-bold text-teal-deep">38%</span>
              </div>
              <ProgressLine value={38} />
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <span className="mini-chip">A</span>
                  <span className="mini-chip">B</span>
                  <span className="mini-chip">?</span>
                </div>
                <p className="text-xs leading-5 text-ink-muted">
                  Você já passou por 2 de 5 formas de evidência.
                </p>
              </div>
            </div>
            <div className="border-l border-ink/10 pl-5">
              <p className="eyebrow mb-2">Ponto de retorno</p>
              <p className="text-sm font-semibold">
                Ferramentas em uma oficina
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                A exploração sempre volta para este objetivo.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("learn")}
            className="button-dark mt-8"
          >
            Retomar de onde parei <ArrowRight size={15} />
          </button>
        </section>

        <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-7">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Seu ritmo</p>
              <h2 className="font-display text-3xl tracking-[-0.035em]">
                Constante.
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal/25 text-teal">
              <Gauge size={21} />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-ink-muted">sessões iniciadas</span>
                <b>4 / 6</b>
              </div>
              <ProgressLine value={67} />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-ink-muted">retorno voluntário</span>
                <b>3 / 4</b>
              </div>
              <ProgressLine value={75} color="bg-coral" />
            </div>
          </div>
          <p className="mt-7 border-t border-ink/10 pt-4 text-xs leading-5 text-ink-muted">
            Métrica auxiliar, não medida de inteligência ou estado mental.
          </p>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_0.82fr]">
        <section className="border border-ink/10 bg-white/55 p-6">
          <div className="mb-5 flex items-center justify-between">
            <p className="eyebrow">A seguir na rota</p>
            <button
              onClick={() => onNavigate("learn")}
              className="text-xs font-bold text-teal-deep hover:underline"
            >
              ver tudo
            </button>
          </div>
          <AnchorRail />
        </section>
        <section className="border border-ink/10 bg-white/55 p-6">
          <div className="mb-5 flex items-center justify-between">
            <p className="eyebrow">Evidência recente</p>
            <EvidenceTag status="simulated" />
          </div>
          <p className="font-display text-2xl leading-tight tracking-[-0.025em]">
            “The tools are not ready.”
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Você produziu a frase com uma dica leve. O próximo teste remove a
            dica e troca o contexto.
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4">
            <span className="flex items-center gap-2 text-xs text-ink-muted">
              <Clock3 size={14} /> há 2 dias
            </span>
            <button
              onClick={() => onNavigate("evidence")}
              className="flex items-center gap-1 text-xs font-bold text-teal-deep"
            >
              ver evidências <ChevronRight size={14} />
            </button>
          </div>
        </section>
        <section className="border border-ink/10 bg-ink p-6 text-paper">
          <div className="mb-6 flex items-center justify-between">
            <p className="eyebrow text-paper/50">Contrato CSLE</p>
            <LockKeyhole size={16} className="text-[#A8E5DD]" />
          </div>
          <p className="font-display text-2xl leading-tight tracking-[-0.025em]">
            Proposta, não autoridade.
          </p>
          <p className="mt-3 text-sm leading-6 text-paper/65">
            O motor mock sugere o próximo passo. Consentimento, critérios e
            aprovação continuam do lado do aplicativo.
          </p>
          <button
            onClick={() => onNavigate("evidence")}
            className="mt-6 flex items-center gap-2 text-xs font-bold text-[#A8E5DD]"
          >
            ver trilha de decisão <ArrowRight size={14} />
          </button>
        </section>
      </div>
    </div>
  );
}

function LearnView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [stage, setStage] = useState<
    "anchor" | "practice" | "transfer" | "pause"
  >("anchor");
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showContract, setShowContract] = useState(false);

  const choices = [
    { id: "is", text: "The station is busy.", correct: true },
    { id: "are", text: "The station are busy.", correct: false },
    { id: "am", text: "The station am busy.", correct: false },
  ];

  if (stage === "pause")
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-teal/20 bg-teal/10 text-teal">
          <Pause size={28} />
        </div>
        <p className="eyebrow mt-7">pausa salva</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.05em]">
          Tudo bem parar aqui.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-muted">
          Seu ponto de retorno está salvo em{" "}
          <b className="text-ink">am / is / are</b>. Quando voltar, começamos
          pelo contexto novo — sem repetir tudo.
        </p>
        <button
          onClick={() => setStage("transfer")}
          className="button-dark mt-8"
        >
          Retomar agora <ArrowRight size={15} />
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-7 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Aprender · âncora 02 / 08</p>
          <h1 className="font-display text-5xl tracking-[-0.05em]">
            am / is / are
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
            O objetivo obrigatório fica aqui. Você pode variar o caminho, mas
            não precisa perder a âncora.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStage("pause")} className="button-outline">
            <Pause size={15} /> pausar
          </button>
          <button
            onClick={() => onNavigate("explore")}
            className="button-outline"
          >
            <Sparkles size={15} /> explorar
          </button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.32fr_1fr_0.34fr]">
        <aside className="border border-ink/10 bg-white/45 p-5">
          <p className="eyebrow mb-4">Linha do currículo</p>
          <AnchorRail compact />
          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-2">Objetivo verificável</p>
            <p className="text-sm leading-6 text-ink-muted">
              Usar <b className="text-ink">am, is e are</b> em afirmações,
              negativas e perguntas.
            </p>
          </div>
        </aside>
        <section className="border border-ink/10 bg-white/65 p-6 sm:p-9">
          {stage === "anchor" && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <StatusPill tone="teal">
                  <BookOpen size={12} /> âncora
                </StatusPill>
                <span className="text-xs text-ink-faint">
                  1 de 3 movimentos
                </span>
              </div>
              <p className="eyebrow mb-4">
                Leia em voz baixa e perceba a estrutura
              </p>
              <div className="space-y-4">
                <div className="sentence-card">
                  <span className="sentence-english">
                    The engine <b>is</b> cold.
                  </span>
                  <span className="sentence-note">uma coisa · singular</span>
                </div>
                <div className="sentence-card">
                  <span className="sentence-english">
                    The valves <b>are</b> damaged.
                  </span>
                  <span className="sentence-note">mais de uma · plural</span>
                </div>
              </div>
              <div className="mt-9 border-l-2 border-teal pl-4">
                <p className="text-sm leading-6 text-ink-muted">
                  O verbo muda para acompanhar quem ou o que está sendo
                  descrito. A forma aparece no contexto — não como uma regra
                  solta.
                </p>
              </div>
              <button
                onClick={() => setStage("practice")}
                className="button-dark mt-9"
              >
                Testar compreensão <ArrowRight size={15} />
              </button>
            </div>
          )}
          {stage === "practice" && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <StatusPill tone="coral">
                  <BrainCircuit size={12} /> compreensão
                </StatusPill>
                <span className="text-xs text-ink-faint">
                  2 de 3 movimentos
                </span>
              </div>
              <p className="eyebrow mb-3">Qual frase está correta?</p>
              <h2 className="font-display text-3xl leading-tight tracking-[-0.035em]">
                Agora o contexto muda: estação de trem.
              </h2>
              <div className="mt-7 space-y-3">
                {choices.map(choice => (
                  <button
                    key={choice.id}
                    onClick={() => setSelected(choice.id)}
                    className={`choice-row ${selected === choice.id ? (choice.correct ? "correct" : "wrong") : ""}`}
                  >
                    <span className="choice-radio">
                      {selected === choice.id && <span />}
                    </span>
                    <span>{choice.text}</span>
                    {selected === choice.id && choice.correct && (
                      <Check size={16} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              {selected && (
                <div
                  className={`mt-6 flex gap-3 border-l-2 pl-4 text-sm leading-6 ${selected === "is" ? "border-teal text-ink-muted" : "border-coral text-ink-muted"}`}
                >
                  {selected === "is" ? (
                    <>
                      <Check size={17} className="mt-1 shrink-0 text-teal" />
                      <p>
                        Isso. <b className="text-ink">station</b> é singular,
                        então usamos <b className="text-ink">is</b>. Esta foi
                        uma evidência de compreensão com ajuda baixa.
                      </p>
                    </>
                  ) : (
                    <>
                      <Info size={17} className="mt-1 shrink-0 text-coral" />
                      <p>
                        Quase. Procure o sujeito da frase:{" "}
                        <b className="text-ink">the station</b> é uma coisa só.
                      </p>
                    </>
                  )}
                </div>
              )}
              <button
                disabled={!selected}
                onClick={() => setStage("transfer")}
                className="button-dark mt-9 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Tentar sem a placa de apoio <ArrowRight size={15} />
              </button>
            </div>
          )}
          {stage === "transfer" && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <StatusPill tone="coral">
                  <Target size={12} /> transferência
                </StatusPill>
                <span className="text-xs text-ink-faint">
                  3 de 3 movimentos
                </span>
              </div>
              <p className="eyebrow mb-3">Produção autônoma</p>
              <h2 className="font-display text-3xl leading-tight tracking-[-0.035em]">
                Como você diria que as ferramentas não estão prontas?
              </h2>
              <div className="mt-7 border border-ink/12 bg-paper px-4 py-3">
                <input
                  autoFocus
                  placeholder="Escreva em inglês…"
                  className="w-full bg-transparent text-base outline-none placeholder:text-ink-faint"
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="text-xs text-ink-faint">
                  sem dica · contexto novo
                </span>
                <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
                  <Headphones size={14} /> ouvir exemplo
                </button>
              </div>
              <button
                onClick={() => setCompleted(true)}
                className="button-dark mt-9"
              >
                Registrar tentativa <Check size={15} />
              </button>
              {completed && (
                <div className="mt-6 border border-teal/20 bg-teal/8 p-4">
                  <div className="flex gap-3">
                    <Check className="mt-0.5 text-teal" size={17} />
                    <div>
                      <p className="text-sm font-bold">Tentativa registrada.</p>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        A aplicação foi observada, mas ainda não é domínio. A
                        retenção será revisitada depois.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate("evidence")}
                    className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-deep"
                  >
                    ver evidências <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <div className="border border-ink/10 bg-[#F5F7FB] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Sugestão do tutor</p>
              <WandSparkles size={16} className="text-teal" />
            </div>
            <p className="text-sm leading-6 text-ink-muted">
              {mockDecision.rationale}
            </p>
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="text-xs font-semibold">Por que estou vendo isso?</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                A compreensão apareceu em contexto familiar, então o próximo
                teste troca o cenário.
              </p>
            </div>
          </div>
          <div className="border border-ink/10 bg-white/45 p-5">
            <div className="mb-4 flex items-center gap-2">
              <LockKeyhole size={14} className="text-ink-muted" />
              <p className="eyebrow">Limites ativos</p>
            </div>
            <ul className="space-y-3 text-xs leading-5 text-ink-muted">
              <li className="flex gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-teal" />{" "}
                currículo obrigatório preservado
              </li>
              <li className="flex gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-teal" /> saída
                e pausa sem penalidade
              </li>
              <li className="flex gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-teal" /> sem
                inferência clínica
              </li>
            </ul>
            <button
              onClick={() => setShowContract(true)}
              className="mt-5 flex items-center gap-1 text-xs font-bold text-teal-deep"
            >
              ver contrato da decisão <ChevronRight size={14} />
            </button>
          </div>
        </aside>
      </div>
      {showContract && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
          <div className="w-full max-w-lg border border-ink/15 bg-paper p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-2">Trilha auditável</p>
                <h2 className="font-display text-3xl tracking-[-0.035em]">
                  O que o motor pode fazer
                </h2>
              </div>
              <button
                onClick={() => setShowContract(false)}
                className="icon-button"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              Esta decisão veio do <b className="text-ink">mock-csle</b>. Ele
              propõe ações elegíveis; não altera evidências, consentimento ou
              critérios de aprovação.
            </p>
            <div className="mt-6 space-y-3">
              {mockDecision.actions.map(action => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 border-b border-ink/8 pb-3"
                >
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-teal/10 text-center text-xs font-bold leading-5 text-teal">
                    {action.type === "pause" ? "Ⅱ" : "→"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      {action.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4">
              <EvidenceTag status="simulated" />
              <span className="text-xs text-ink-faint">incerteza média</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [activeExplore, setActiveExplore] = useState<string | null>(null);
  const cards = [
    {
      id: "workshop",
      icon: Settings2,
      eyebrow: "ponte contextual",
      title: "Inglês na oficina",
      text: "Vocabulário de ferramentas e frases para explicar um problema.",
      time: "6 min",
      tone: "teal",
      tag: "interesse salvo",
    },
    {
      id: "video",
      icon: Video,
      eyebrow: "curadoria externa",
      title: "Ver antes de praticar",
      text: "Um vídeo curto sobre o verbo to be, com trilha de atenção dentro do app.",
      time: "8 min",
      tone: "coral",
      tag: "fonte não verificada",
    },
    {
      id: "series",
      icon: Film,
      eyebrow: "laboratório de série",
      title: "Friends · S05 E07",
      text: "Cole o episódio que você vai assistir e transforme a legenda em pontos de observação.",
      time: "variável",
      tone: "dark",
      tag: "em breve",
    },
  ];
  return (
    <div className="space-y-9">
      <SectionHeading
        eyebrow="Explorar · espirais opcionais"
        title="Curiosidade também é caminho."
        description="Você pode abrir uma ramificação, aprofundar e voltar quando quiser. A âncora fica visível — e nada aqui substitui a evidência de aprendizagem."
        action={
          <button
            onClick={() => onNavigate("learn")}
            className="button-outline hidden sm:flex"
          >
            <RotateCcw size={15} /> voltar à âncora
          </button>
        }
      />
      <div className="border border-ink/10 bg-ink p-6 text-paper sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#A8E5DD]">
              <Sparkles size={14} /> espiral aberta · 02
            </div>
            <h2 className="font-display text-3xl tracking-[-0.035em] sm:text-4xl">
              A âncora continua sendo{" "}
              <span className="text-[#A8E5DD]">am / is / are</span>.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/65">
              Escolha um contexto para tornar o próximo exemplo mais
              significativo. O limite desta exploração é conservador e pode ser
              encerrado sem perder o ponto de retorno.
            </p>
          </div>
          <div className="shrink-0 border-l border-paper/15 pl-6">
            <p className="eyebrow text-paper/45">limite desta espiral</p>
            <p className="mt-2 font-display text-3xl">8 min</p>
            <p className="mt-1 text-xs text-paper/50">
              ajustável pelo estudante
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          const isActive = activeExplore === card.id;
          return (
            <article
              key={card.id}
              className={`explore-card ${isActive ? "active" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className={`explore-icon ${card.tone}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs text-ink-faint">{card.time}</span>
              </div>
              <p className="eyebrow mt-7">{card.eyebrow}</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.025em]">
                {card.title}
              </h2>
              <p className="mt-3 min-h-[52px] text-sm leading-6 text-ink-muted">
                {card.text}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4">
                <StatusPill
                  tone={
                    card.tone === "teal"
                      ? "teal"
                      : card.tone === "coral"
                        ? "coral"
                        : "neutral"
                  }
                >
                  {card.tag}
                </StatusPill>
                {card.id === "series" ? (
                  <button className="icon-button" aria-label="Em breve">
                    <LockKeyhole size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveExplore(card.id)}
                    className="button-icon"
                  >
                    {isActive ? <Check size={16} /> : <ArrowRight size={16} />}
                  </button>
                )}
              </div>
              {isActive && (
                <div className="mt-5 border-t border-teal/15 pt-4">
                  <p className="text-xs leading-5 text-ink-muted">
                    Entrada selecionada.{" "}
                    <button
                      onClick={() => onNavigate("learn")}
                      className="font-bold text-teal-deep underline"
                    >
                      voltar à âncora
                    </button>{" "}
                    quando quiser.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border border-ink/10 bg-white/55 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
              <MessageCircle size={19} />
            </div>
            <div>
              <p className="eyebrow">Conversa ativa</p>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.025em]">
                “Não entendi essa fala.”
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Quando o motor real estiver conectado, este espaço poderá
                transformar uma pergunta espontânea em uma próxima ação — sempre
                dentro do currículo e dos limites autorizados.
              </p>
              <button className="button-dark mt-6 opacity-55">
                <Play size={14} /> iniciar conversa (demo)
              </button>
            </div>
          </div>
        </section>
        <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Mídia não é domínio</p>
            <Info size={16} className="text-coral" />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            Assistir a um vídeo ou episódio pode ajudar na aquisição, mas o app
            ainda precisa observar recuperação, aplicação, transferência e
            retenção em itens independentes.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-ink">
            <ExternalLink size={14} className="text-teal" /> fontes externas
            entram com procedência
          </div>
        </section>
      </div>
      <ContentLibrary />
    </div>
  );
}

function EvidenceView() {
  const [selectedRow, setSelectedRow] = useState("Transferência");
  const total = useMemo(
    () =>
      Math.round(
        evidenceRows.reduce((sum, row) => sum + row.value, 0) /
          evidenceRows.length
      ),
    []
  );
  return (
    <div className="space-y-9">
      <SectionHeading
        eyebrow="Evidências · leitura honesta"
        title="Progresso que aguenta perguntas."
        description="Aqui, progresso não é só sensação. Cada camada pede um tipo diferente de demonstração — e a incerteza permanece visível."
        action={
          <StatusPill tone="teal">
            <ListChecks size={12} /> {total}% estimativa média
          </StatusPill>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-ink/10 bg-white/55 p-6 sm:p-8">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <p className="eyebrow mb-2">Âncora atual</p>
              <h2 className="font-display text-3xl tracking-[-0.035em]">
                am / is / are
              </h2>
            </div>
            <EvidenceTag status="simulated" />
          </div>
          <div className="space-y-4">
            {evidenceRows.map(row => (
              <button
                key={row.label}
                onClick={() => setSelectedRow(row.label)}
                className={`evidence-row ${selectedRow === row.label ? "selected" : ""}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`evidence-icon ${row.kind}`}>
                    <span />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold">
                      {row.label}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {row.note}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex w-[140px] items-center gap-3">
                  <ProgressLine
                    value={row.value}
                    color={row.status === "simulated" ? "bg-teal" : "bg-coral"}
                  />
                  <span className="w-8 text-right text-xs font-bold">
                    {row.value}%
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-7 border-t border-ink/10 pt-5">
            <div className="flex items-start gap-3">
              <Info size={16} className="mt-0.5 shrink-0 text-teal" />
              <p className="text-xs leading-5 text-ink-muted">
                A estimativa acima combina observações demonstrativas. Ela não é
                uma certificação e não deve ser usada fora deste protótipo.
              </p>
            </div>
          </div>
        </section>
        <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-8">
          <p className="eyebrow mb-2">Leitura selecionada</p>
          <h2 className="font-display text-3xl tracking-[-0.035em]">
            {selectedRow}
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {evidenceRows.find(row => row.label === selectedRow)?.note}. Esta
            camada ainda precisa de itens inéditos e comparáveis antes de
            sustentar uma decisão de domínio.
          </p>
          <div className="mt-7 border-y border-ink/10 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-muted">
                confiança da estimativa
              </span>
              <span className="text-sm font-bold text-coral-deep">média</span>
            </div>
            <div className="mt-3">
              <ProgressLine value={54} color="bg-coral" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral" />
            <p className="text-xs leading-5 text-ink-muted">
              Próxima verificação: item sem contexto de oficina, sem dica, com
              formato equivalente.
            </p>
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-ink/10 bg-ink p-6 text-paper sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <p className="eyebrow text-paper/50">Retenção planejada</p>
            <Clock3 size={16} className="text-[#A8E5DD]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { day: "7", label: "primeiro retorno", state: "agendado" },
              { day: "30", label: "consolidação", state: "planejado" },
              { day: "90", label: "retenção longa", state: "planejado" },
            ].map(item => (
              <div className="border border-paper/12 p-4" key={item.day}>
                <p className="font-display text-3xl text-[#A8E5DD]">
                  {item.day}
                  <span className="ml-1 text-sm">d</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-paper/55">
                  {item.label}
                </p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-paper/35">
                  {item.state}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-paper/50">
            A agenda registra a intenção de medir retenção; ainda não é um
            resultado observado.
          </p>
        </section>
        <section className="border border-ink/10 bg-white/55 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Trilha de decisão</p>
              <h2 className="font-display text-2xl tracking-[-0.025em]">
                Mock CSLE · sessão 001
              </h2>
            </div>
            <StatusPill tone="dark">
              <LockKeyhole size={11} /> somente proposta
            </StatusPill>
          </div>
          <div className="mt-6 space-y-4">
            {[
              {
                icon: BrainCircuit,
                title: "Observação registrada",
                body: "Compreensão correta com auxílio leve em contexto de oficina.",
                time: "07:14",
              },
              {
                icon: WandSparkles,
                title: "Ação elegível proposta",
                body: "Testar em contexto novo para observar transferência.",
                time: "07:15",
              },
              {
                icon: Flag,
                title: "Critério preservado",
                body: "Sem certificação: retenção e transferência ainda pendentes.",
                time: "07:15",
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="timeline-icon">
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 border-b border-ink/8 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="text-[10px] text-ink-faint">
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const identity = trpc.auth.me.useQuery(undefined, { retry: false });
  return (
    <Shell view={view} onNavigate={setView} accountEmail={identity.data?.email ?? undefined}>
      {view === "home" && <HomeView onNavigate={setView} />}
      {view === "learn" && <LearnView onNavigate={setView} />}
      {view === "read" && <ReadingLab />}
      {view === "review" && <ReviewDeck />}
      {view === "explore" && <ExploreView onNavigate={setView} />}
      {view === "evidence" && <EvidenceView />}
    </Shell>
  );
}
