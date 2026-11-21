import { useEffect, useRef, useState } from "react";
import {
  Check,
  Headphones,
  Info,
  Mic,
  Play,
  Square,
  Volume2,
} from "lucide-react";
import {
  analyzeShadowingAudio,
  type ShadowingFeedback,
} from "@/lib/shadowing-feedback";

const model = {
  text: "HE ALSO THOUGHT OF HIS MANAGERIAL POSITION",
  audio: "/content/audio/librispeech/2277-149896-0003.wav",
  source: "LibriSpeech · 2277-149896-0003 · CC BY 4.0",
};

type Reflection = "same" | "needs-work" | null;

export default function ShadowingPractice() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [reflection, setReflection] = useState<Reflection>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<ShadowingFeedback | null>(
    null
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const startRecording = async () => {
    setRecordingError(null);
    setFallbackUsed(false);
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setRecordingError(
        "Este navegador não disponibilizou o microfone. Você pode praticar sem gravar."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setRecordingUrl(URL.createObjectURL(blob));
        void analyzeLocalFeedback(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setRecordedSeconds(0);
      setIsRecording(true);
    } catch {
      setRecordingError(
        "Não foi possível acessar o microfone. Continue sem gravar e observe ritmo, pausas e sons finais."
      );
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  };

  const chooseFallback = () => {
    setFallbackUsed(true);
    setRecordingError(null);
    setReflection(null);
    setLocalFeedback(null);
  };

  const analyzeLocalFeedback = async (blob: Blob) => {
    let context: AudioContext | null = null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;
      context = new AudioContextClass();
      const [referenceBuffer, learnerBuffer] = await Promise.all([
        fetch(model.audio).then(response => response.arrayBuffer()),
        blob.arrayBuffer(),
      ]);
      const [referenceAudio, learnerAudio] = await Promise.all([
        context.decodeAudioData(referenceBuffer),
        context.decodeAudioData(learnerBuffer),
      ]);
      setLocalFeedback(
        analyzeShadowingAudio(
          referenceAudio.getChannelData(0),
          learnerAudio.getChannelData(0),
          referenceAudio.sampleRate,
          learnerAudio.sampleRate
        )
      );
    } catch {
      // Métricas locais são opcionais; gravação e reflexão continuam utilizáveis.
    } finally {
      await context?.close();
    }
  };

  return (
    <section className="border border-ink/10 bg-[#F5F7FB] p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">Shadowing · escuta e fala</p>
          <h2 className="font-display text-3xl tracking-[-0.035em]">
            Ouça. Repita. Compare.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            Siga a fala original sem tentar traduzir palavra por palavra. O
            feedback abaixo é uma reflexão guiada, não uma nota automática.
          </p>
        </div>
        <span className="text-xs text-ink-faint">sem certificação</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border border-ink/10 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Áudio original</p>
              <p className="font-display text-2xl leading-tight">
                {model.text}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
              <Headphones size={18} />
            </div>
          </div>
          <audio
            controls
            preload="metadata"
            src={model.audio}
            className="mt-5 h-9 w-full"
          />
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-ink-faint">
            <Info size={13} className="mt-0.5 shrink-0" /> {model.source}. Áudio
            local auditado; preserve atribuição e licença.
          </p>
        </div>

        <div className="border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Sua versão</p>
              <p className="text-xs leading-5 text-ink-muted">
                Tente acompanhar o ritmo, as pausas e o final das palavras.
              </p>
            </div>
            <span className="font-mono text-xs text-ink-faint">
              00:{String(recordedSeconds).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isRecording ? (
              <button onClick={startRecording} className="button-dark">
                <Mic size={15} /> gravar versão
              </button>
            ) : (
              <button onClick={stopRecording} className="button-outline">
                <Square size={14} fill="currentColor" /> parar gravação
              </button>
            )}
            {recordingUrl && !isRecording && (
              <audio controls src={recordingUrl} className="h-9 max-w-full" />
            )}
          </div>
          {recordingError && (
            <p className="mt-3 text-xs leading-5 text-coral-deep">
              {recordingError}
            </p>
          )}
          <button
            onClick={chooseFallback}
            className="mt-4 flex items-center gap-1.5 text-xs font-bold text-teal-deep hover:underline"
          >
            <Play size={13} /> praticar sem microfone
          </button>
        </div>
      </div>

      {(recordingUrl || fallbackUsed) && (
        <div className="mt-5 border border-teal/20 bg-white p-5">
          <p className="eyebrow mb-3">Feedback local · formativo</p>
          {localFeedback && (
            <div className="mb-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-3">
              <p className="border border-ink/10 p-3">
                Duração: {localFeedback.durationDeviationPercent}% de diferença
              </p>
              <p className="border border-ink/10 p-3">
                Pausas: {localFeedback.pauseCount} acima de 300 ms
              </p>
              <p className="border border-ink/10 p-3">
                Próximo foco:{" "}
                {localFeedback.guidance === "notice-pauses"
                  ? "observar pausas"
                  : localFeedback.guidance === "slow-up"
                    ? "aproximar o ritmo"
                    : localFeedback.guidance === "slow-down"
                      ? "dar espaço entre palavras"
                      : "manter este ritmo"}
              </p>
            </div>
          )}
          <p className="text-sm leading-6 text-ink-muted">
            Depois de ouvir sua tentativa, qual aspecto merece sua próxima
            repetição?
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setReflection("same")}
              className={`border p-3 text-left text-xs transition ${reflection === "same" ? "border-teal bg-teal/5" : "border-ink/10 hover:border-teal/40"}`}
            >
              <span className="flex items-center gap-2 font-bold">
                <Check size={14} /> O ritmo ficou próximo
              </span>
              <span className="mt-1 block text-ink-muted">
                Repita buscando sons finais mais claros.
              </span>
            </button>
            <button
              onClick={() => setReflection("needs-work")}
              className={`border p-3 text-left text-xs transition ${reflection === "needs-work" ? "border-teal bg-teal/5" : "border-ink/10 hover:border-teal/40"}`}
            >
              <span className="flex items-center gap-2 font-bold">
                <Volume2 size={14} /> Preciso de outra tentativa
              </span>
              <span className="mt-1 block text-ink-muted">
                Ouça um trecho menor e acompanhe as pausas.
              </span>
            </button>
          </div>
          {reflection && (
            <p className="mt-4 border-l-2 border-teal pl-3 text-xs leading-5 text-ink-muted">
              Próximo passo sugerido:{" "}
              {reflection === "same"
                ? "uma repetição com atenção à clareza"
                : "ouvir novamente e repetir em velocidade confortável"}
              . Essa escolha é uma pista de estudo, não uma avaliação de
              proficiência.
            </p>
          )}
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 border-t border-ink/10 pt-5 text-xs leading-5 text-ink-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-teal" /> A gravação fica
        nesta sessão. Nenhum acerto, transcrição ou autoavaliação é enviado
        automaticamente ao CSLE.
      </p>
    </section>
  );
}
