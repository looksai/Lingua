import {
  BarChart3,
  Check,
  Clock3,
  Download,
  Info,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { SrsRating } from "@shared/learning";
import {
  createPendingLearningOperation, enqueueLearningOperationCoordinated,
  pendingLearningCount, replayPendingLearningOperations,
} from "@/lib/offline-learning";
import { subscribeLearningQueue } from "@/lib/offline-coordination";

type ReviewFilter = "due" | "all";
type ReportWindow = "30" | "90" | "all";

const RETENTION_KEY = "lingua.retention.plan.v1";
const defaultRetention = [7, 30, 90];

const ratings: Array<{ id: SrsRating; label: string }> = [
  { id: "again", label: "Esqueci" },
  { id: "hard", label: "Difícil" },
  { id: "good", label: "Lembrei" },
  { id: "easy", label: "Fácil" },
];

function isDue(dueAt: Date | string) {
  return new Date(dueAt).getTime() <= Date.now();
}

function nextIntervalLabel(rating: SrsRating) {
  if (rating === "again") return "retorna em instantes";
  if (rating === "hard") return "retorno curto";
  if (rating === "easy") return "intervalo ampliado";
  return "próximo retorno";
}

export default function ReviewDeck() {
  const [filter, setFilter] = useState<ReviewFilter>("due");
  const [message, setMessage] = useState<string | null>(null);
  const [reportWindow, setReportWindow] = useState<ReportWindow>("90");
  const [retentionDays, setRetentionDays] = useState<number[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RETENTION_KEY) ?? "null");
      return Array.isArray(stored)
        ? stored.filter(day => [7, 30, 90].includes(day))
        : defaultRetention;
    } catch {
      return defaultRetention;
    }
  });
  const authQuery = trpc.auth.me.useQuery();
  const itemsQuery = trpc.learning.listItems.useQuery(
    {},
    { enabled: Boolean(authQuery.data), retry: false }
  );
  const reviewMutation = trpc.learning.review.useMutation();
  const saveMutation = trpc.learning.saveItem.useMutation();
  const removeMutation = trpc.learning.removeItem.useMutation();
  const [pendingCount, setPendingCount] = useState(0);
  const historyQuery = trpc.learning.history.useQuery(
    { limit: 200 },
    { enabled: Boolean(authQuery.data), retry: false }
  );
  const utils = trpc.useUtils();
  const ownerId = authQuery.data?.id;
  const [verifiedOwnerId, setVerifiedOwnerId] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setVerifiedOwnerId(null);
    if (ownerId) {
      void (async () => {
        try {
          await Promise.all([
            utils.learning.listItems.reset(), utils.learning.history.reset(),
          ]);
          await Promise.all([itemsQuery.refetch(), historyQuery.refetch()]);
          if (!cancelled) setVerifiedOwnerId(ownerId);
        } catch { /* No cross-account cached view; leave the panel empty. */ }
      })();
    }
    return () => { cancelled = true; };
  }, [ownerId]);
  useEffect(() => {
    const refresh = () => setPendingCount(ownerId ? pendingLearningCount(ownerId) : 0);
    return ownerId ? subscribeLearningQueue(ownerId, refresh) : (refresh(), () => {});
  }, [ownerId]);
  useEffect(() => {
    if (!ownerId || pendingCount === 0) return;
    let cancelled = false;
    void replayPendingLearningOperations(ownerId, {
      save: async payload => (await saveMutation.mutateAsync(payload)).item.id,
      review: input => reviewMutation.mutateAsync(input),
      remove: knowledgeItemId => removeMutation.mutateAsync({ knowledgeItemId }),
    }, () => cancelled).then(result => {
      if (!cancelled) {
        setPendingCount(result.remaining);
        if (result.synced) {
          void itemsQuery.refetch();
          void historyQuery.refetch();
        }
      }
    }).catch(() => {
      if (!cancelled) setMessage("Algumas operações aguardam conexão ou confirmação; nenhuma foi descartada.");
    });
    return () => { cancelled = true; };
  }, [ownerId, pendingCount]);
  const items = verifiedOwnerId === ownerId ? (itemsQuery.data ?? []) : [];
  const history = verifiedOwnerId === ownerId ? (historyQuery.data ?? []) : [];
  const reportHistory = useMemo(() => {
    if (reportWindow === "all") return history;
    const cutoff = Date.now() - Number(reportWindow) * 24 * 60 * 60 * 1000;
    return history.filter(
      entry => new Date(entry.createdAt).getTime() >= cutoff
    );
  }, [history, reportWindow]);
  const ratingCounts = useMemo(
    () =>
      reportHistory.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.rating] = (counts[entry.rating] ?? 0) + 1;
        return counts;
      }, {}),
    [reportHistory]
  );
  const timeline = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of reportHistory) {
      const day = new Date(entry.createdAt).toLocaleDateString("pt-BR");
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return Array.from(byDay.entries()).slice(0, 14);
  }, [reportHistory]);

  const toggleRetention = (day: number) => {
    setRetentionDays(current => {
      const next = current.includes(day)
        ? current.filter(item => item !== day)
        : [...current, day].sort((a, b) => a - b);
      localStorage.setItem(RETENTION_KEY, JSON.stringify(next));
      return next;
    });
  };

  const exportAudit = () => {
    const payload = {
      schema: "lingua.learning-audit.v1",
      exportedAt: new Date().toISOString(),
      scope: "SRS review telemetry only",
      reportWindow,
      retentionPlanDays: retentionDays,
      knowledgeItems: items.map(row => ({
        id: row.item.id,
        itemKey: row.item.itemKey,
        text: row.item.text,
        normalizedText: row.item.normalizedText,
        language: row.item.language,
        sourceId: row.item.sourceId,
        sourceRecordId: row.item.sourceRecordId,
        license: row.item.license,
        state: row.state,
      })),
      reviewLogs: reportHistory,
      limits: [
        "Este arquivo descreve agenda SRS e não certifica proficiência.",
        "Não inclui transcrições, autoavaliações ou decisões do CSLE.",
        "O período depende do histórico disponível no servidor e do filtro escolhido.",
      ],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lingua-learning-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const visibleItems = useMemo(
    () =>
      filter === "due" ? items.filter(row => isDue(row.state.dueAt)) : items,
    [filter, items]
  );

  const review = (knowledgeItemId: number, rating: SrsRating, text: string) => {
    setMessage(null);
    const ownerId = authQuery.data?.id;
    if (!ownerId) return;
    const operation = createPendingLearningOperation({ type: "review", knowledgeItemId, rating });
    reviewMutation.mutate(
      { knowledgeItemId, rating, operationId: operation.id },
      {
        onSuccess: () => {
          setMessage(
            `${text} revisado: ${nextIntervalLabel(rating)}. Isso atualiza a agenda SRS, não uma evidência de domínio.`
          );
          void utils.learning.listItems.invalidate();
        },
        onError: error => {
          void enqueueLearningOperationCoordinated(ownerId, operation).then(() => {
            setPendingCount(pendingLearningCount(ownerId));
            setMessage(`${text} ficou na fila offline. Será sincronizada quando a conexão voltar.`);
          }).catch(() => {
            setMessage("Não foi possível salvar essa revisão na fila com segurança. Reabra o navegador compatível antes de sair.");
          });
        },
      }
    );
  };

  if (!authQuery.data) {
    return (
      <div className="space-y-8">
        <header className="border-b border-ink/10 pb-8">
          <p className="eyebrow mb-3">Revisar · agenda pessoal</p>
          <h1 className="font-display text-5xl tracking-[-0.05em]">
            Sua revisão, sem bloqueios.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">
            Entre para sincronizar os itens salvos entre sessões. Enquanto isso,
            o Laboratório de Leitura continua disponível com revisão local.
          </p>
        </header>
        <div className="border border-ink/10 bg-[#F5F7FB] p-6 text-sm leading-6 text-ink-muted">
          A revisão persistente depende de uma sessão autenticada. Nenhum item é
          transformado em domínio apenas por aparecer nesta tela.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Revisar · agenda pessoal</p>
          <h1 className="font-display text-5xl tracking-[-0.05em]">
            Voltar no momento certo.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">
            Todos os itens salvos ficam aqui. Comece pelo que venceu, ou
            percorra a biblioteca inteira sem transformar repetição em
            certificação.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" /> {pendingCount ? `${pendingCount} operação(ões) pendente(s)` : "fila local sem pendências"}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex border border-ink/10 bg-white p-1">
          {(["due", "all"] as ReviewFilter[]).map(option => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-4 py-2 text-xs font-bold ${filter === option ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"}`}
            >
              {option === "due" ? "Para revisar agora" : "Todos os salvos"}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-faint">
          {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} nesta
          visão · {items.filter(row => isDue(row.state.dueAt)).length} vencido
          {items.filter(row => isDue(row.state.dueAt)).length === 1 ? "" : "s"}
        </span>
      </div>

      {message && (
        <div className="flex items-start gap-2 border-l-2 border-teal bg-[#EFF6FF] p-4 text-xs leading-5 text-ink-muted">
          <Check size={14} className="mt-0.5 shrink-0 text-teal" /> {message}
        </div>
      )}

      {itemsQuery.isPending ? (
        <div className="border border-ink/10 bg-white p-6 text-sm text-ink-muted">
          Carregando sua biblioteca de revisão…
        </div>
      ) : itemsQuery.error ? (
        <div className="border border-coral/20 bg-[#FFF7F4] p-6 text-sm leading-6 text-coral-deep">
          Não foi possível sincronizar sua biblioteca agora. A prática local
          continua disponível no Laboratório de Leitura.
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="border border-ink/10 bg-[#F5F7FB] p-8">
          <p className="eyebrow mb-2">Nada pendente nesta visão</p>
          <h2 className="font-display text-3xl tracking-[-0.035em]">
            A agenda pode respirar.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
            Salve palavras no Laboratório de Leitura ou alterne para “Todos os
            salvos”. O aplicativo não cria urgência artificial para manter você
            praticando.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleItems.map(row => (
            <article
              key={row.item.id}
              className="border border-ink/10 bg-white p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">
                    {row.item.kind === "word" ? "palavra" : "frase"} ·{" "}
                    {row.item.language}
                  </p>
                  <h2 className="font-display text-3xl tracking-[-0.04em]">
                    {row.item.text}
                  </h2>
                  {row.item.translation && (
                    <p className="mt-2 text-sm font-semibold text-teal-deep">
                      {row.item.translation}
                    </p>
                  )}
                </div>
                <span
                  className={`flex items-center gap-1 text-xs ${isDue(row.state.dueAt) ? "text-coral-deep" : "text-ink-faint"}`}
                >
                  <Clock3 size={13} />{" "}
                  {isDue(row.state.dueAt) ? "agora" : "agendado"}
                </span>
              </div>
              {row.item.example && (
                <p className="mt-5 border-l-2 border-teal pl-3 font-display text-lg">
                  “{row.item.example}”
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ratings.map(rating => (
                  <button
                    key={rating.id}
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      review(row.item.id, rating.id, row.item.text)
                    }
                    className="border border-ink/10 p-3 text-left transition hover:border-teal/40 hover:bg-teal/5 disabled:opacity-40"
                  >
                    <span className="block text-xs font-bold">
                      {rating.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-ink-faint">
                      {rating.id}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-5 flex items-start gap-2 border-t border-ink/8 pt-4 text-xs leading-5 text-ink-muted">
                <Info size={13} className="mt-0.5 shrink-0 text-teal" /> Estado{" "}
                {row.state.state}; {row.state.repetitions} retorno
                {row.state.repetitions === 1 ? "" : "s"}. SRS organiza retorno,
                não certifica aprendizagem.
              </p>
            </article>
          ))}
        </div>
      )}

      <section className="border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Relatório longitudinal · agenda SRS</p>
            <h2 className="font-display text-2xl tracking-[-0.03em]">
              O que o SRS está registrando?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Este relatório mostra volume e escolhas de revisão no período
              selecionado. Não estima proficiência, não substitui evidência e
              não é enviado ao CSLE como domínio.
            </p>
          </div>
          <BarChart3 size={20} className="shrink-0 text-teal" />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-ink/8 py-3">
          <div className="flex border border-ink/10 bg-white p-1">
            {(["30", "90", "all"] as ReportWindow[]).map(window => (
              <button
                key={window}
                onClick={() => setReportWindow(window)}
                className={`px-3 py-1.5 text-[11px] font-bold ${reportWindow === window ? "bg-ink text-paper" : "text-ink-muted"}`}
              >
                {window === "all" ? "todo histórico" : `${window} dias`}
              </button>
            ))}
          </div>
          <button onClick={exportAudit} className="button-outline">
            <Download size={14} /> exportar JSON auditável
          </button>
        </div>
        {historyQuery.error ? (
          <p className="mt-5 text-xs text-coral-deep">
            O histórico ainda não pôde ser carregado; a fila continua
            disponível.
          </p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {ratings.map(rating => (
              <div
                key={rating.id}
                className="border border-ink/10 bg-[#F5F7FB] p-4"
              >
                <p className="text-xs font-bold">{rating.label}</p>
                <p className="mt-2 font-display text-3xl">
                  {ratingCounts[rating.id] ?? 0}
                </p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  {reportHistory.length} registros no período
                </p>
              </div>
            ))}
          </div>
        )}
        {timeline.length > 0 && (
          <div className="mt-6 border-t border-ink/8 pt-5">
            <p className="eyebrow mb-3">Ritmo observado · não é meta</p>
            <div className="flex flex-wrap gap-2">
              {timeline.map(([day, count]) => (
                <div
                  key={day}
                  className="border border-ink/10 bg-[#F5F7FB] px-3 py-2 text-xs"
                >
                  <span className="font-semibold">{day}</span>
                  <span className="ml-2 text-ink-muted">
                    {count} revisão{count === 1 ? "" : "ões"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-5 flex items-start gap-2 border-t border-ink/8 pt-4 text-xs leading-5 text-ink-muted">
          <Info size={13} className="mt-0.5 shrink-0 text-teal" /> Os logs
          servem para depurar a agenda e orientar o retorno. Uma sequência de
          “fácil” ou “difícil” não é uma certificação.
        </p>
      </section>

      <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Retenção planejada · configurável</p>
            <h2 className="font-display text-2xl tracking-[-0.03em]">
              Escolha quando voltar a observar.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Estes marcos organizam futuras observações. Ativar um marco não
              significa que a retenção foi comprovada.
            </p>
          </div>
          <SlidersHorizontal size={20} className="shrink-0 text-teal" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {defaultRetention.map(day => {
            const active = retentionDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleRetention(day)}
                className={`border p-4 text-left transition ${active ? "border-teal bg-white" : "border-ink/10 bg-white/50 opacity-60"}`}
              >
                <p className="font-display text-3xl">
                  {day}
                  <span className="ml-1 text-sm">d</span>
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {active ? "marco ativo" : "marco pausado"}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-5 flex items-start gap-2 border-t border-ink/8 pt-4 text-xs leading-5 text-ink-muted">
          <Info size={13} className="mt-0.5 shrink-0 text-teal" /> A
          configuração fica local neste dispositivo por enquanto; ela não altera
          o estado SRS nem cria evidência.
        </p>
      </section>

      <div className="flex items-start gap-2 border-t border-ink/10 pt-5 text-xs leading-5 text-ink-muted">
        <RotateCcw size={14} className="mt-0.5 shrink-0 text-teal" />
        <p>
          As respostas atualizam somente o estado de revisão e o log de agenda.
          Evidências, incerteza e decisões pedagógicas permanecem em camadas
          separadas.
        </p>
      </div>
    </div>
  );
}
