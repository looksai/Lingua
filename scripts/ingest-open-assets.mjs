import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("..", import.meta.url);
const outputDir = new URL("client/public/content/", root);
const audioDir = new URL("client/public/content/audio/librispeech/", root);
await mkdir(outputDir, { recursive: true });
await mkdir(audioDir, { recursive: true });

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Lingua-content-ingestor/1.0" },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const body = await response.text();
  return { body, sha256: createHash("sha256").update(body).digest("hex"), url };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Lingua-content-ingestor/1.0",
      accept: "application/json",
    },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const body = await response.text();
  return {
    json: JSON.parse(body),
    sha256: createHash("sha256").update(body).digest("hex"),
    url,
  };
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Lingua-content-ingestor/1.0" },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    url,
  };
}

function writeJson(name, payload) {
  return writeFile(
    new URL(name, outputDir),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

const cmuSource = await fetchText(
  "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"
);
const cmuEntries = cmuSource.body
  .split("\n")
  .filter(Boolean)
  .map(line => {
    const [rawWord, ...phones] = line.trim().split(/\s+/);
    const variant = rawWord.match(/^(.*)\\((\\d+)\\)$/);
    return {
      word: variant?.[1] ?? rawWord,
      variant: variant ? Number(variant[2]) : 0,
      pronunciation: phones,
    };
  });
await writeJson("cmudict-en-us.json", {
  schema: "lingua.content.v1",
  sourceId: "cmudict",
  source: "CMU Pronouncing Dictionary",
  locale: "en-US",
  license: "CMUdict license (preserve LICENSE and disclaimer)",
  sourceUrl: "https://github.com/cmusphinx/cmudict",
  retrievedAt: new Date().toISOString(),
  sourceSha256: cmuSource.sha256,
  phoneticSystem: "ARPAbet",
  entries: cmuEntries,
});

const tatoebaSource = await fetchJson(
  "https://api.tatoeba.org/unstable/sentences?lang=eng&sort=words&limit=40"
);
const tatoebaSentences = tatoebaSource.json.data
  .filter(item => item.license === "CC BY 2.0 FR" || item.license === "CC0 1.0")
  .slice(0, 24)
  .map(item => ({
    id: String(item.id),
    language: item.lang,
    text: item.text,
    license: item.license,
    author: item.owner,
    sourceUrl: `https://tatoeba.org/en/sentences/show/${item.id}`,
    reviewStatus: "needs-pedagogical-review",
  }));
await writeJson("tatoeba-english.json", {
  schema: "lingua.content.v1",
  sourceId: "tatoeba-text",
  source: "Tatoeba",
  locale: "en",
  license:
    "Per-item license preserved; text subset excludes non-CC0/CC BY records",
  sourceUrl: "https://tatoeba.org/en/downloads",
  retrievedAt: new Date().toISOString(),
  sourceSha256: tatoebaSource.sha256,
  sentences: tatoebaSentences,
});

const libriSpeechRows = await fetchJson(
  "https://datasets-server.huggingface.co/first-rows?dataset=openslr%2Flibrispeech_asr&config=clean&split=validation"
);
const libriSpeechPreview = [];
for (const item of libriSpeechRows.json.rows.slice(0, 4)) {
  const row = item.row;
  const audioUrl = row.audio?.[0]?.src;
  if (!audioUrl) continue;
  const audio = await fetchBytes(audioUrl);
  const fileName = `${row.id}.wav`;
  await writeFile(new URL(fileName, audioDir), audio.bytes);
  libriSpeechPreview.push({
    id: row.id,
    text: row.text,
    speakerId: String(row.speaker_id),
    chapterId: String(row.chapter_id),
    audio: `/content/audio/librispeech/${fileName}`,
    sourceAudioUrl: audioUrl,
    sha256: audio.sha256,
    license: "CC BY 4.0",
    sourceUrl: "https://www.openslr.org/12",
    reviewStatus: "ready-for-listening-review",
  });
}
await writeJson("librispeech-preview.json", {
  schema: "lingua.content.v1",
  sourceId: "librispeech-slr12-preview",
  source: "LibriSpeech / OpenSLR SLR12 via Hugging Face Dataset Server",
  locale: "en",
  license: "CC BY 4.0",
  sourceUrl: "https://www.openslr.org/12",
  retrievedAt: new Date().toISOString(),
  records: libriSpeechPreview,
});

const libriVoxSource = await fetchJson(
  "https://librivox.org/api/feed/audiobooks?format=json&limit=6"
);
const firstLibriVoxId = libriVoxSource.json.books[0]?.id;
const libriVoxRss = firstLibriVoxId
  ? await fetchText(`https://librivox.org/rss/${firstLibriVoxId}`)
  : null;
const firstChapterPreviewUrl =
  libriVoxRss?.body.match(
    /<enclosure\s+url="([^"]+)"[^>]*type="audio\/mpeg"/
  )?.[1] ?? null;
const libriVoxBooks = libriVoxSource.json.books.map(book => ({
  id: String(book.id),
  title: book.title,
  language: book.language ?? "English",
  authors: book.authors,
  url: book.url_librivox,
  listenUrl: book.url_zip_file ?? book.url_rss,
  sourceStatus: "catalog-only-territorial-review",
  previewUrl:
    String(book.id) === String(firstLibriVoxId) ? firstChapterPreviewUrl : null,
  note: "Verify work, translation, recording and target jurisdiction before redistribution.",
}));
await writeJson("librivox-catalog.json", {
  schema: "lingua.content.v1",
  sourceId: "librivox",
  source: "LibriVox",
  locale: "en",
  license: "Public domain policy; verify work and jurisdiction per item",
  sourceUrl: "https://librivox.org/pages/public-domain/",
  apiUrl: "https://librivox.org/api/info",
  retrievedAt: new Date().toISOString(),
  sourceSha256: libriVoxSource.sha256,
  previewUrl: firstChapterPreviewUrl,
  books: libriVoxBooks,
});

const manifest = {
  schema: "lingua.content-manifest.v1",
  generatedAt: new Date().toISOString(),
  policy: {
    noAutomaticCertification: true,
    audioRedistribution: "quarantine-until-item-license-reviewed",
    takedownSupported: true,
  },
  sources: [
    {
      id: "cmudict",
      name: "CMU Pronouncing Dictionary",
      kind: "pronunciation",
      integration: "local-dataset",
      status: "integrated-with-notice",
      license: "CMUdict license",
      attribution:
        "Carnegie Mellon University; preserve repository LICENSE and disclaimer.",
      asset: "/content/cmudict-en-us.json",
      records: cmuEntries.length,
      sha256: cmuSource.sha256,
    },
    {
      id: "tatoeba-text",
      name: "Tatoeba textual sample",
      kind: "sentences",
      integration: "local-curated-sample",
      status: "integrated-needs-pedagogical-review",
      license: "Per-item CC BY 2.0 FR or CC0 1.0",
      attribution:
        "Preserve author, sentence ID, source URL and license per item.",
      asset: "/content/tatoeba-english.json",
      records: tatoebaSentences.length,
      sha256: tatoebaSource.sha256,
    },
    {
      id: "librispeech-slr12",
      name: "LibriSpeech / OpenSLR SLR12",
      kind: "audio-transcript",
      integration: "source-registered-subset-ready",
      status: "catalogued-download-on-demand",
      license: "CC BY 4.0",
      attribution:
        "OpenSLR SLR12 / LibriSpeech; include license, source URL and modifications.",
      sourceUrl: "https://www.openslr.org/12",
      sampleUrl: "https://openslr.trmal.net/resources/12/dev-clean.tar.gz",
      records: null,
      sha256: null,
      previewAsset: "/content/librispeech-preview.json",
      previewRecords: libriSpeechPreview.length,
      note: "Four short WAV previews are local; the full corpus is intentionally not committed.",
    },
    {
      id: "librivox",
      name: "LibriVox",
      kind: "audiobook",
      integration: "catalog-local-audio-external",
      status: "catalogued-territorial-review",
      license: "Public domain policy; verify per work and jurisdiction",
      attribution:
        "Preserve LibriVox ID, title, author, reader, URL and collection date.",
      asset: "/content/librivox-catalog.json",
      records: libriVoxBooks.length,
      sha256: libriVoxSource.sha256,
      previewUrl: firstChapterPreviewUrl,
      note: "Do not redistribute audio until work, recording and jurisdiction are reviewed.",
    },
  ],
};
await writeJson("manifest.json", manifest);
console.log(
  JSON.stringify(
    {
      cmudict: cmuEntries.length,
      tatoeba: tatoebaSentences.length,
      librivox: libriVoxBooks.length,
      outputDir: new URL("client/public/content/", root).pathname,
    },
    null,
    2
  )
);
