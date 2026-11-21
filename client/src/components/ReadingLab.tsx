import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Headphones,
  Info,
  Mic,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import type {
  SpeechObservationCandidate,
  SpeechPipelineStage,
  SpeechTranscription,
} from "@/lib/speech-contract";
import { trpc } from "@/lib/trpc";
import ShadowingPractice from "@/components/ShadowingPractice";
import {
  enqueueLearningOperation,
  createPendingLearningOperation,
  replayPendingLearningOperations,
  resolvePendingLearningItem,
  pendingLearningCount,
  type OfflineSaveItem,
} from "@/lib/offline-learning";
import {
  applySrsReview,
  createInitialReviewState,
  normalizeKnowledgeText,
  previewSrsIntervals,
  type ReviewState,
  type SrsRating,
} from "@shared/learning";

const passage = [
  { words: ["The", "station", "is", "busy,"] },
  { words: ["but", "the", "repair", "team", "is", "ready", "to", "help."] },
  { words: ["Before", "the", "train", "leaves,"] },
  {
    words: [
      "they",
      "check",
      "the",
      "tools",
      "and",
      "explain",
      "the",
      "problem",
      "clearly.",
    ],
  },
];

const readingText =
  "The station is busy, but the repair team is ready to help. Before the train leaves, they check the tools and explain the problem clearly.";

const vocabulary: Record<
  string,
  { meaning: string; note: string; example: string }
> = {
  station: {
    meaning: "estação",
    note: "substantivo · um lugar",
    example: "The station is busy.",
  },
  repair: {
    meaning: "reparo / conserto",
    note: "relacionado a consertar algo",
    example: "The repair team is ready.",
  },
  ready: {
    meaning: "pronto / preparada",
    note: "adjetivo · estado atual",
    example: "The tools are ready.",
  },
  check: {
    meaning: "verificar",
    note: "verbo · observar para confirmar",
    example: "They check the tools.",
  },
  clearly: {
    meaning: "claramente",
    note: "advérbio · como uma ação acontece",
    example: "Explain the problem clearly.",
  },
};

export default function ReadingLab() {
  const [selectedWord, setSelectedWord] = useState("station");
  const [savedWords, setSavedWords] = useState<string[]>(["ready"]);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>(
    () => ({ ready: createInitialReviewState("word-ready") })
  );
  const [serverItemIds, setServerItemIds] = useState<Record<string, number>>(
    {}
  );
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<
    "local" | "syncing" | "synced"
  >("local");
  const [pendingCount, setPendingCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] =
    useState<SpeechPipelineStage>("idle");
  const [transcription, setTranscription] =
    useState<SpeechTranscription | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [observationCandidate, setObservationCandidate] =
    useState<SpeechObservationCandidate | null>(null);
  const transcriptionMutation = trpc.speech.transcribe.useMutation();
  const authQuery = trpc.auth.me.useQuery();
  const ownerId = authQuery.data?.id;
  const utils = trpc.useUtils();
  const [verifiedOwnerId, setVerifiedOwnerId] = useState<number | null>(null);
  const savedItemsQuery = trpc.learning.listItems.useQuery(
    {},
    { enabled: Boolean(authQuery.data), retry: false }
  );
  const saveItemMutation = trpc.learning.saveItem.useMutation();
  const removeItemMutation = trpc.learning.removeItem.useMutation();
  const reviewMutation = trpc.learning.review.useMutation();
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selected = vocabulary[selectedWord];
  const wordCount = useMemo(
    () => passage.flatMap(line => line.words).length,
    []
  );
  const dueWords = useMemo(
    () =>
      savedWords.filter(word => {
        const state = reviewStates[word];
        return state && new Date(state.dueAt).getTime() <= Date.now();
      }),
    [reviewStates, savedWords]
  );

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(
      () => setRecordedSeconds(seconds => seconds + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    },
    [recordingUrl]
  );

  useEffect(() => {
    let cancelled = false;
    setVerifiedOwnerId(null);
    // React Query keys are not user-scoped, so discard old authenticated
    // results before hydrating a new person's local study state.
    setServerItemIds({});
    setSavedWords(["ready"]);
    setReviewStates({ ready: createInitialReviewState("word-ready") });
    setPersistenceStatus("local");
    if (ownerId) {
      void (async () => {
        try {
          await utils.learning.listItems.reset();
          await savedItemsQuery.refetch();
          if (!cancelled) setVerifiedOwnerId(ownerId);
        } catch { /* Local practice remains available. */ }
      })();
    }
    return () => { cancelled = true; };
  }, [ownerId]);

  useEffect(() => {
    if (!savedItemsQuery.data || !ownerId || verifiedOwnerId !== ownerId) return;
    setSavedWords(current =>
      Array.from(
        new Set([
          ...current,
          ...savedItemsQuery.data.map(row => row.item.normalizedText),
        ])
      )
    );
    setServerItemIds(current =>
      Object.fromEntries([
        ...Object.entries(current),
        ...savedItemsQuery.data.map(row => [
          row.item.normalizedText,
          row.item.id,
        ]),
      ])
    );
    setReviewStates(current =>
      Object.fromEntries([
        ...Object.entries(current),
        ...savedItemsQuery.data.map(row => [
          row.item.normalizedText,
          {
            knowledgeItemId: String(row.item.id),
            state: row.state.state,
            easeFactor: row.state.easeFactor,
            intervalDays: row.state.intervalDays,
            repetitions: row.state.repetitions,
            lapses: row.state.lapses,
            dueAt: new Date(row.state.dueAt).toISOString(),
            lastReviewedAt: row.state.lastReviewedAt
              ? new Date(row.state.lastReviewedAt).toISOString()
              : undefined,
          },
        ]),
      ])
    );
    setPersistenceStatus(ownerId && pendingLearningCount(ownerId) ? "local" : "synced");
  }, [savedItemsQuery.data, ownerId, verifiedOwnerId]);

  useEffect(() => {
    if (!savedItemsQuery.error) return;
    setPersistenceStatus("local");
    setReviewMessage(
      "Não foi possível sincronizar sua biblioteca agora; o estudo local continua disponível."
    );
  }, [savedItemsQuery.error]);

  useEffect(() => {
    const refresh = () => setPendingCount(ownerId ? pendingLearningCount(ownerId) : 0);
    window.addEventListener("lingua:offline-queue", refresh);
    window.addEventListener("online", refresh);
    refresh();
    return () => {
      window.removeEventListener("lingua:offline-queue", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || pendingCount === 0) return;
    let cancelled = false;
    const replay = async () => {
      try {
        const result = await replayPendingLearningOperations(ownerId, {
          save: async payload => (await saveItemMutation.mutateAsync(payload)).item.id,
          review: input => reviewMutation.mutateAsync(input),
          remove: knowledgeItemId => removeItemMutation.mutateAsync({ knowledgeItemId }),
        }, () => cancelled);
        if (!cancelled) {
          setPendingCount(result.remaining);
          setPersistenceStatus(result.synced ? "synced" : "local");
          if (result.synced) void savedItemsQuery.refetch();
        }
      } catch {
        if (!cancelled) {
          setPersistenceStatus("local");
          setReviewMessage(
            "Existem operações pendentes ou referências ainda não confirmadas; nenhuma revisão foi descartada."
          );
        }
      }
    };
    void replay();
    return () => { cancelled = true; };
  }, [ownerId, pendingCount]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const prepareTranscription = async () => {
    if (!recordingUrl) return;
    setPipelineStage("transcription-pending");
    setRecordingError(null);
    try {
      const blob = await fetch(recordingUrl).then(response => response.blob());
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      const result = await transcriptionMutation.mutateAsync({
        audioBase64: btoa(binary),
        mimeType: blob.type.startsWith("audio/ogg")
          ? "audio/ogg"
          : "audio/webm",
        language: "en",
      });
      setTranscription(result);
      setReviewText(result.segments.map(segment => segment.text).join(" "));
      setObservationCandidate(null);
      setPipelineStage("transcribed");
    } catch (error) {
      setPipelineStage("recorded");
      setRecordingError(
        error instanceof Error
          ? error.message
          : "Não foi possível transcrever a gravação."
      );
    }
  };

  const confirmTranscription = () => {
    if (!transcription || !reviewText.trim()) return;
    setObservationCandidate({
      submissionId: "speech-demo-001",
      anchorId: "be-forms",
      transcriptText: reviewText.trim(),
      evidenceKind: "application",
      status: "candidate",
      reviewer: "student",
      corrected:
        reviewText.trim() !==
        transcription.segments.map(segment => segment.text).join(" "),
      uncertainty: transcription.uncertainty,
      notes: [
        "Texto revisado pelo estudante; análise linguística ainda pendente.",
      ],
    });
    setPipelineStage("analysis-pending");
  };

  const toggleSaved = () => {
    setSavedWords(current => {
      if (current.includes(selectedWord)) {
        const serverItemId = serverItemIds[selectedWord];
        if (serverItemId && authQuery.data) {
          setPersistenceStatus("syncing");
          removeItemMutation.mutate(
            { knowledgeItemId: serverItemId },
            {
              onSuccess: () => setPersistenceStatus(ownerId && pendingLearningCount(ownerId) ? "local" : "synced"),
              onError: error => {
                if (ownerId) enqueueLearningOperation(ownerId, {
                  type: "remove",
                  clientKey: normalizeKnowledgeText(selectedWord),
                  knowledgeItemId: serverItemId,
                });
                setPendingCount(ownerId ? pendingLearningCount(ownerId) : 0);
                setPersistenceStatus("local");
                setReviewMessage(error.message);
              },
            }
          );
        }
        return current.filter(word => word !== selectedWord);
      }
      const nextState =
        reviewStates[selectedWord] ??
        createInitialReviewState(`word-${selectedWord}`);
      setReviewStates(states =>
        states[selectedWord]
          ? states
          : {
              ...states,
              [selectedWord]: nextState,
            }
      );
      setReviewMessage(null);
      if (authQuery.data) {
        setPersistenceStatus("syncing");
        const savePayload: OfflineSaveItem = {
          itemKey: `reading-lab:${normalizeKnowledgeText(selectedWord)}`,
          kind: "word",
          text: selectedWord,
          normalizedText: normalizeKnowledgeText(selectedWord),
          language: "en",
          translation: selected?.meaning,
          example: selected?.example,
          sourceId: "lingua-reading-lab",
          sourceRecordId: `reading-${normalizeKnowledgeText(selectedWord)}`,
          license: "Lingua-authored context",
          curriculumAnchors: JSON.stringify(["be-forms"]),
        };
        saveItemMutation.mutate(savePayload, {
          onSuccess: result => {
            setServerItemIds(ids => ({
              ...ids,
              [selectedWord]: result.item.id,
            }));
            setReviewStates(states => ({
              ...states,
              [selectedWord]: {
                ...nextState,
                knowledgeItemId: String(result.item.id),
                dueAt: new Date(result.state.dueAt).toISOString(),
                state: result.state.state,
                easeFactor: result.state.easeFactor,
                intervalDays: result.state.intervalDays,
                repetitions: result.state.repetitions,
                lapses: result.state.lapses,
                lastReviewedAt: result.state.lastReviewedAt
                  ? new Date(result.state.lastReviewedAt).toISOString()
                  : undefined,
              },
            }));
            if (ownerId) resolvePendingLearningItem(ownerId, normalizeKnowledgeText(selectedWord), result.item.id);
            setPersistenceStatus(ownerId && pendingLearningCount(ownerId) ? "local" : "synced");
          },
          onError: () => {
            if (ownerId) enqueueLearningOperation(ownerId, {
              type: "save",
              clientKey: normalizeKnowledgeText(selectedWord),
              payload: savePayload,
            });
            setPendingCount(ownerId ? pendingLearningCount(ownerId) : 0);
            setPersistenceStatus("local");
            setReviewMessage(
              "Banco indisponível nesta sessão; a palavra continua salva localmente."
            );
          },
        });
      }
      return [...current, selectedWord];
    });
  };

  const reviewWord = (word: string, rating: SrsRating) => {
    const state = reviewStates[word];
    if (!state) return;
    const result = applySrsReview(state, rating);
    setReviewStates(states => ({ ...states, [word]: result }));
    setReviewMessage(
      `${word} revisada: próxima revisão em ${result.nextIntervalLabel}. Isso é um agendamento, não uma evidência de domínio.`
    );
    const serverItemId = serverItemIds[word];
    if (ownerId) {
      // Stable across first attempt, network-unknown outcome and every retry.
      const operation = createPendingLearningOperation({
        type: "review",
        clientKey: normalizeKnowledgeText(word),
        knowledgeItemId: serverItemId,
        rating,
      });
      if (serverItemId) {
        setPersistenceStatus("syncing");
        reviewMutation.mutate(
          { knowledgeItemId: serverItemId, rating, operationId: operation.id },
          {
            onSuccess: persisted => {
              setReviewStates(states => ({
                ...states,
                [word]: {
                  ...result,
                  dueAt: new Date(persisted.dueAt).toISOString(),
                  state: persisted.state,
                  easeFactor: persisted.easeFactor,
                  intervalDays: persisted.intervalDays,
                  repetitions: persisted.repetitions,
                  lapses: persisted.lapses,
                  lastReviewedAt: persisted.lastReviewedAt
                    ? new Date(persisted.lastReviewedAt).toISOString()
                    : undefined,
                },
              }));
              setPersistenceStatus(pendingLearningCount(ownerId) ? "local" : "synced");
            },
            onError: () => {
              enqueueLearningOperation(ownerId, operation);
              setPendingCount(pendingLearningCount(ownerId));
              setPersistenceStatus("local");
              setReviewMessage(`${word} aguarda confirmação do servidor.`);
            },
          }
        );
      } else {
        enqueueLearningOperation(ownerId, operation);
        setPendingCount(pendingLearningCount(ownerId));
        setPersistenceStatus("local");
        setReviewMessage(`${word} aguarda a sincronização do item.`);
      }
    }
  };

  const reviewTarget = dueWords[0] ?? savedWords[0];
  const reviewTargetState = reviewTarget
    ? reviewStates[reviewTarget]
    : undefined;
  const reviewIntervals = reviewTargetState
    ? previewSrsIntervals(reviewTargetState)
    : undefined;

  const startRecording = async () => {
    setRecordingError(null);
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        "Seu navegador não disponibilizou gravação nesta sessão."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event =>
        event.data.size > 0 && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setRecordingUrl(URL.createObjectURL(blob));
        setPipelineStage("recorded");
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setRecordedSeconds(0);
      setPipelineStage("recording");
      setIsRecording(true);
    } catch {
      setRecordingError(
        "Não foi possível acessar o microfone. Você pode continuar sem gravar."
      );
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-7 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Ler · laboratório contextual</p>
          <h1 className="font-display text-5xl tracking-[-0.05em]">
            Inglês em contexto.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
            Leia sem sair da rota. Toque em uma palavra para investigar, salve o
            que merece retorno e depois responda sem consultar o texto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <BookIcon /> {wordCount} palavras
          </span>
          <button onClick={() => speak(readingText)} className="button-outline">
            <Headphones size={15} />{" "}
            {isSpeaking ? "ouvindo trecho" : "ouvir trecho"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.36fr]">
        <section className="border border-ink/10 bg-white p-6 sm:p-9">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Texto guiado · nível A2/B1</p>
              <h2 className="font-display text-3xl tracking-[-0.035em]">
                Before the train leaves
              </h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Info size={14} /> leitura assistida
            </span>
          </div>
          <div className="reading-passage" aria-label="Texto em inglês">
            {passage.map((line, index) => (
              <p key={index}>
                {line.words.map((word, wordIndex) => {
                  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
                  const isKnown = Boolean(vocabulary[clean]);
                  return (
                    <button
                      key={`${word}-${wordIndex}`}
                      onClick={() => isKnown && setSelectedWord(clean)}
                      className={`reading-word ${selectedWord === clean ? "selected" : ""} ${isKnown ? "known" : ""}`}
                    >
                      {word}
                    </button>
                  );
                })}
              </p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Volume2 size={14} className="text-teal" /> Leia primeiro pelo
              sentido geral.
            </div>
            <button className="flex items-center gap-1.5 text-xs font-bold text-teal-deep hover:underline">
              <RotateCcw size={14} /> recomeçar leitura
            </button>
          </div>
        </section>

        <aside className="border border-ink/10 bg-[#F5F7FB] p-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="eyebrow">Palavra em foco</p>
            <button
              aria-label="Salvar palavra"
              onClick={toggleSaved}
              className={`bookmark-button ${savedWords.includes(selectedWord) ? "saved" : ""}`}
            >
              <BookmarkPlus size={16} />
            </button>
          </div>
          <p className="font-display text-4xl tracking-[-0.04em]">
            {selectedWord}
          </p>
          <p className="mt-2 text-sm font-semibold text-teal-deep">
            {selected?.meaning}
          </p>
          <p className="mt-4 border-l-2 border-teal pl-3 text-xs leading-5 text-ink-muted">
            {selected?.note}
          </p>
          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-2">No texto</p>
            <p className="font-display text-xl">“{selected?.example}”</p>
            <button
              onClick={() => speak(selected?.example ?? "")}
              className="mt-4 flex items-center gap-1.5 text-xs font-bold text-teal-deep"
            >
              <Volume2 size={14} /> ouvir exemplo
            </button>
          </div>
          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="text-xs leading-5 text-ink-muted">
              Salvar uma palavra cria um item para revisão futura. Ainda não é
              evidência de domínio.
            </p>
            <p className="mt-3 text-xs font-semibold text-ink">
              {savedWords.length} palavra{savedWords.length === 1 ? "" : "s"} na
              sua lista
            </p>
          </div>
        </aside>
      </div>

      <section className="border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2">
              Revisão{" "}
              {persistenceStatus === "synced"
                ? "sincronizada"
                : persistenceStatus === "syncing"
                  ? "sincronizando"
                  : "local"}{" "}
              · SRS
            </p>
            <h2 className="font-display text-3xl tracking-[-0.035em]">
              O que merece voltar agora?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
              As palavras salvas viram itens de conhecimento reutilizáveis.
              Escolha como foi a lembrança; o intervalo é uma agenda de retorno,
              não uma nota nem uma decisão do CSLE.
            </p>
          </div>
          <span className="text-xs text-ink-faint">
            {dueWords.length} para revisar agora · {savedWords.length} salvas
            {pendingCount > 0 &&
              ` · ${pendingCount} pendente${pendingCount === 1 ? "" : "s"} offline`}
          </span>
        </div>
        {reviewTarget && reviewTargetState && reviewIntervals ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="border border-teal/20 bg-[#EFF6FF] p-5">
              <p className="eyebrow mb-2">item em foco</p>
              <h3 className="font-display text-4xl tracking-[-0.04em]">
                {reviewTarget}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">
                {vocabulary[reviewTarget]?.meaning} ·{" "}
                {reviewTargetState.state === "new"
                  ? "primeira revisão"
                  : "retorno agendado"}
              </p>
              <p className="mt-5 border-l-2 border-teal pl-3 text-xs leading-5 text-ink-muted">
                Lembre pelo sentido antes de olhar a frase. A avaliação é sua
                percepção da lembrança, não uma classificação automática de
                domínio.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3">próximo intervalo</p>
              <div className="grid grid-cols-2 gap-2">
                {(["again", "hard", "good", "easy"] as SrsRating[]).map(
                  rating => (
                    <button
                      key={rating}
                      onClick={() => reviewWord(reviewTarget, rating)}
                      disabled={
                        saveItemMutation.isPending || reviewMutation.isPending
                      }
                      className="border border-ink/10 bg-white p-3 text-left transition hover:border-teal/40 hover:bg-teal/5"
                    >
                      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-ink">
                        {rating === "again"
                          ? "Esqueci"
                          : rating === "hard"
                            ? "Difícil"
                            : rating === "good"
                              ? "Lembrei"
                              : "Fácil"}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {reviewIntervals[rating]}
                      </span>
                    </button>
                  )
                )}
              </div>
              {reviewMessage && (
                <p className="mt-4 border-l-2 border-teal pl-3 text-xs leading-5 text-ink-muted">
                  {reviewMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 border border-ink/10 bg-[#F5F7FB] p-5 text-sm text-ink-muted">
            Salve uma palavra durante a leitura para abrir a primeira revisão.
          </div>
        )}
        <p className="mt-6 border-t border-ink/10 pt-4 text-xs leading-5 text-ink-muted">
          {persistenceStatus === "synced"
            ? "Estado sincronizado para esta sessão autenticada. A fila continua sem transformar revisão em domínio."
            : "Estado local desta sessão. Se o banco ou a autenticação não estiverem disponíveis, a prática continua sem bloqueio."}
        </p>
      </section>

      <section className="border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2">Gravação · transcrição opcional</p>
            <h2 className="font-display text-2xl tracking-[-0.03em]">
              Preparar uma resposta para revisão humana.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Este gravador alimenta o pipeline Whisper já existente. Ele é
              separado do shadowing e não cria nota automática.
            </p>
          </div>
          <span className="text-xs text-ink-faint">sem nota automática</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button onClick={startRecording} className="button-dark">
              <Mic size={15} /> gravar resposta
            </button>
          ) : (
            <button onClick={stopRecording} className="button-outline">
              <Square size={14} fill="currentColor" /> parar gravação
            </button>
          )}
          {recordingUrl && (
            <audio controls src={recordingUrl} className="h-9 max-w-full" />
          )}
          <span className="font-mono text-xs text-ink-faint">
            00:{String(recordedSeconds).padStart(2, "0")}
          </span>
        </div>
        {recordingError && (
          <p className="mt-3 text-xs text-coral-deep">{recordingError}</p>
        )}
      </section>
      <ShadowingPractice />

      <section className="border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2">Pipeline de evidência · fala</p>
            <h2 className="font-display text-3xl tracking-[-0.035em]">
              Da gravação à observação.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
              A cadeia está desenhada antes de receber o motor. Cada etapa
              conserva a incerteza e impede que uma transcrição seja tratada
              como domínio.
            </p>
          </div>
          <span className="evidence-tag simulated">motor aguardando</span>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          {[
            {
              id: "recorded",
              label: "Gravação",
              detail:
                pipelineStage === "idle"
                  ? "ainda não criada"
                  : "salva nesta sessão",
            },
            {
              id: "transcription-pending",
              label: "Transcrição",
              detail:
                transcription?.status === "complete"
                  ? "1 segmento · simulado"
                  : "adaptador Whisper",
            },
            {
              id: "analysis-pending",
              label: "Análise",
              detail: "forma e contexto",
            },
            {
              id: "evidence-ready",
              label: "Evidência",
              detail: "proposta, não nota",
            },
          ].map((item, index) => {
            const active =
              pipelineStage === item.id ||
              (pipelineStage === "recorded" && index === 0);
            const reached = pipelineStage !== "idle" && index === 0;
            return (
              <div
                key={item.id}
                className={`pipeline-step ${active ? "active" : ""} ${reached ? "reached" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="pipeline-dot">
                    {reached ? <Check size={12} /> : index + 1}
                  </span>
                  <p className="text-xs font-bold">{item.label}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
          <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-teal" />{" "}
            {pipelineStage === "recorded"
              ? "A gravação está pronta para ser enviada quando o adaptador estiver conectado."
              : "Faça uma gravação acima para abrir a primeira etapa."}
          </p>
          <button
            disabled={
              pipelineStage !== "recorded" || transcriptionMutation.isPending
            }
            onClick={prepareTranscription}
            className="button-outline disabled:opacity-35"
          >
            {transcriptionMutation.isPending
              ? "transcrevendo..."
              : transcription
                ? "refazer transcrição"
                : "Preparar para transcrição"}{" "}
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {transcription?.status === "complete" && (
        <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Saída do serviço · revisão humana</p>
              <h2 className="font-display text-2xl tracking-[-0.03em]">
                Confira antes de registrar
              </h2>
            </div>
            <span className="evidence-tag simulated">
              incerteza {transcription.uncertainty}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            A transcrição é uma hipótese sobre o que foi dito. Corrija palavras,
            pontuação ou frases antes de criar uma candidata a observação.
          </p>
          <textarea
            value={reviewText}
            onChange={event => {
              setReviewText(event.target.value);
              setObservationCandidate(null);
            }}
            rows={3}
            className="mt-5 w-full resize-y border border-ink/15 bg-white p-4 font-display text-xl leading-relaxed outline-none transition focus:border-teal"
            aria-label="Revisar transcrição"
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
              <Info size={14} className="mt-0.5 shrink-0 text-coral" /> O texto
              corrigido continua sendo uma candidata, não uma nota.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setReviewText("");
                  setObservationCandidate(null);
                  setPipelineStage("transcribed");
                }}
                className="button-outline"
              >
                Revisar de novo
              </button>
              <button
                disabled={!reviewText.trim()}
                onClick={confirmTranscription}
                className="button-dark disabled:opacity-35"
              >
                Confirmar texto <Check size={14} />
              </button>
            </div>
          </div>
          {observationCandidate && (
            <div className="mt-5 border border-teal/25 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow text-teal-deep">Candidata a observação</p>
                <span className="evidence-tag simulated">aguarda análise</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Aplicação contextual · revisada por você ·{" "}
                {observationCandidate.corrected
                  ? "texto corrigido"
                  : "texto confirmado"}
                . O CSLE só poderá receber esta candidata depois da próxima
                etapa de análise.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2">Depois da leitura · compreensão</p>
            <h2 className="font-display text-3xl tracking-[-0.035em]">
              Por que a equipe verifica as ferramentas?
            </h2>
            <p className="mt-3 text-sm text-ink-muted">
              Responda com suas palavras. Você pode consultar o texto uma vez,
              mas marque isso para a evidência.
            </p>
          </div>
          <span className="text-xs text-ink-faint">sem certificação</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            "Because the station is busy.",
            "Because they want to confirm everything is ready.",
            "Because the train is late.",
          ].map((answer, index) => (
            <button
              key={answer}
              onClick={() => setAnswered(index === 1)}
              className={`choice-row ${answered && index === 1 ? "correct" : ""}`}
            >
              <span className="choice-radio">
                {answered && index === 1 && <span />}
              </span>
              <span>{answer}</span>
            </button>
          ))}
        </div>
        {answered && (
          <div className="mt-5 flex items-start gap-3 border-l-2 border-teal pl-4 text-sm leading-6 text-ink-muted">
            <Check size={17} className="mt-1 shrink-0 text-teal" />
            <p>
              Boa leitura. Você conectou a ação{" "}
              <b className="text-ink">check</b> ao propósito do texto. Essa
              observação será registrada como compreensão contextual.
            </p>
          </div>
        )}
        <button
          disabled={!answered}
          className="button-dark mt-7 disabled:opacity-35"
        >
          Registrar e seguir <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function BookIcon() {
  return <span className="reading-stat-icon">Aa</span>;
}
