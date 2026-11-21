import {
  BookOpen,
  Check,
  ExternalLink,
  FileAudio,
  Headphones,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

type ContentSource = {
  id: string;
  name: string;
  kind: string;
  integration: string;
  status: string;
  license: string;
  attribution: string;
  asset?: string;
  sourceUrl?: string;
  sampleUrl?: string;
  previewUrl?: string | null;
  previewAsset?: string;
  previewRecords?: number;
  records: number | null;
  note?: string;
};

type Manifest = { sources: ContentSource[] };
type AudioPreview = { id: string; text: string; audio: string; sha256: string };

const kindCopy: Record<string, { label: string; icon: typeof BookOpen }> = {
  pronunciation: { label: "pronúncia", icon: Volume2 },
  sentences: { label: "frases", icon: BookOpen },
  "audio-transcript": { label: "áudio + transcrição", icon: FileAudio },
  audiobook: { label: "audiolivro", icon: Headphones },
};

const statusCopy: Record<string, string> = {
  "integrated-with-notice": "integrado com aviso",
  "integrated-needs-pedagogical-review": "integrado · revisão pedagógica",
  "catalogued-download-on-demand": "catálogo pronto · subset sob demanda",
  "catalogued-territorial-review": "catálogo pronto · revisão territorial",
};

export default function ContentLibrary() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [libriSpeechPreview, setLibriSpeechPreview] = useState<AudioPreview[]>(
    []
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/content/manifest.json")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("manifest"))
      )
      .then(setManifest)
      .catch(() => setError(true));
    fetch("/content/librispeech-preview.json")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("preview"))
      )
      .then(data => setLibriSpeechPreview(data.records ?? []))
      .catch(() => setLibriSpeechPreview([]));
  }, []);

  return (
    <section className="border border-ink/10 bg-white/55 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-deep">
            <ShieldCheck size={14} /> biblioteca com procedência
          </div>
          <h2 className="font-display text-3xl tracking-[-0.035em]">
            Fontes que podem virar prática.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            Os bancos entram por função: pronúncia, frases, áudio e leitura
            extensiva. Licença, versão e revisão ficam visíveis antes de
            qualquer conteúdo virar evidência.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-deep">
          <Check size={14} /> ingestão automatizada concluída
        </div>
      </div>

      {error && (
        <p className="mt-6 border border-coral/20 bg-coral/8 p-4 text-sm text-ink-muted">
          O catálogo local ainda não carregou. A interface continua protegendo o
          fluxo, mas a ingestão precisa ser executada novamente.
        </p>
      )}
      {!manifest && !error && (
        <p className="mt-6 text-sm text-ink-muted">
          Carregando catálogo e licenças…
        </p>
      )}
      {manifest && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {manifest.sources.map(source => {
            const meta = kindCopy[source.kind] ?? kindCopy.sentences;
            const Icon = meta.icon;
            const isAudio =
              source.kind === "audio-transcript" || source.kind === "audiobook";
            return (
              <article
                key={source.id}
                className={`border p-5 ${isAudio ? "border-teal/20 bg-[#EFF6FF]" : "border-ink/10 bg-paper/45"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 text-teal">
                      <Icon size={19} />
                    </div>
                    <div>
                      <p className="eyebrow">{meta.label}</p>
                      <h3 className="mt-1 font-display text-2xl tracking-[-0.025em]">
                        {source.name}
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-deep">
                    {source.records === null
                      ? "subset"
                      : `${source.records.toLocaleString("pt-BR")} registros`}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="border border-teal/20 bg-teal/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-deep">
                    {statusCopy[source.status] ?? source.status}
                  </span>
                  <span className="border border-ink/10 bg-white/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    {source.license}
                  </span>
                </div>
                <p className="mt-4 text-xs leading-5 text-ink-muted">
                  {source.attribution}
                </p>
                {source.note && (
                  <p className="mt-3 border-l-2 border-coral/60 pl-3 text-xs leading-5 text-ink-muted">
                    {source.note}
                  </p>
                )}
                {source.previewUrl && (
                  <div className="mt-4 border-t border-ink/10 pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      <Headphones size={12} className="text-teal" /> preview
                      oficial · não hospedado pelo Lingua
                    </p>
                    <audio
                      controls
                      preload="none"
                      className="h-9 w-full"
                      src={source.previewUrl}
                    >
                      Seu navegador não suporta áudio.
                    </audio>
                  </div>
                )}
                {source.previewAsset && libriSpeechPreview.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      <FileAudio size={12} className="text-teal" />{" "}
                      {source.previewRecords} previews locais · CC BY 4.0
                    </p>
                    {libriSpeechPreview.map(preview => (
                      <div
                        key={preview.id}
                        className="border border-ink/8 bg-white/60 p-3"
                      >
                        <p className="text-xs leading-5 text-ink">
                          {preview.text}
                        </p>
                        <audio
                          controls
                          preload="none"
                          className="mt-2 h-8 w-full"
                          src={preview.audio}
                        >
                          Seu navegador não suporta áudio.
                        </audio>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-4 border-t border-ink/10 pt-4 text-xs font-bold text-teal-deep">
                  <a
                    href={source.sourceUrl ?? source.sampleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    abrir fonte <ExternalLink size={13} />
                  </a>
                  {source.sampleUrl && (
                    <a
                      href={source.sampleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      ver subset <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-6 flex gap-3 border-t border-ink/10 pt-5">
        <Headphones size={16} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-xs leading-5 text-ink-muted">
          A prioridade de áudio fica com LibriSpeech para listening acompanhado
          e validação do Whisper. LibriVox entra como escuta extensiva. Nenhum
          áudio é convertido automaticamente em domínio, nota ou certificação.
        </p>
      </div>
    </section>
  );
}
