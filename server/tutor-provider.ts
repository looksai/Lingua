import { parseTutorMemoryEnvelope } from "./learner-memory";
import { TUTOR_MAX_AUDIO_BYTES, TUTOR_MAX_TEXT, type TutorAudioType, type TutorHistory, type TutorProfile, systemInstructions } from "../shared/tutor";

export type TutorProvider = {
  transcribe(bytes: Uint8Array, mime: TutorAudioType): Promise<string>;
  reply(profile: TutorProfile, history: TutorHistory[], message: string, memoryFacts?: readonly string[]): Promise<string>;
  replyWithProposal(profile: TutorProfile, history: TutorHistory[], message: string, memoryFacts: readonly string[]): Promise<ReturnType<typeof parseTutorMemoryEnvelope>>;
  speak(text: string): Promise<string | null>;
};
const extensions: Record<TutorAudioType,string> = {
  "audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/wav":"wav",
};
export function speechConfigured(env = process.env, now = Date.now()) {
  // Legacy /audio/speech is a temporary explicitly configured staging bridge.
  // Its documented shutdown is 2027-01-06. Never pretend a model switch
  // is sufficient for the new Realtime API protocol.
  return Boolean(env.OPENAI_API_KEY && env.LINGUA_TUTOR_TTS_PROVIDER === "openai-legacy" &&
    ["tts-1","tts-1-hd","gpt-4o-mini-tts"].includes(env.LINGUA_TUTOR_TTS_MODEL ?? "") &&
    now < Date.parse("2027-01-06T00:00:00Z"));
}
async function boundedBytes(res: Response, cap: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) throw Error("empty provider body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > cap) { await reader.cancel(); throw Error("provider response too large"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
export function createOpenAITutor(env = process.env, request: typeof fetch = fetch): TutorProvider {
  const key = env.OPENAI_API_KEY;
  const asrModel = env.LINGUA_TUTOR_ASR_MODEL || "gpt-transcribe";
  const textModel = env.LINGUA_TUTOR_TEXT_MODEL || "gpt-4o-mini";
  async function call(path: string, body: BodyInit, json: boolean, cap: number) {
    if (!key) throw Error("provider unavailable");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18_000);
    try {
      const response = await request("https://api.openai.com/v1/" + path, {
        method: "POST", body, signal: controller.signal, redirect: "error",
        headers: { Authorization: "Bearer " + key, ...(json ? {"Content-Type":"application/json"} : {}) },
      });
      if (!response.ok) { await response.body?.cancel(); throw Error("provider rejected request"); }
      return await boundedBytes(response, cap);
    } finally { clearTimeout(timeout); }
  }
  function extractText(value: unknown, max: number) {
    if (typeof value !== "string" || !value.trim()) throw Error("empty provider text");
    return value.trim().slice(0,max);
  }
  return {
    async transcribe(bytes,mime) {
      if (!bytes.length || bytes.length>TUTOR_MAX_AUDIO_BYTES) throw Error("invalid audio size");
      const form = new FormData();
      form.append("file",new Blob([new Uint8Array(bytes)],{type:mime}),"recording."+extensions[mime]);
      form.append("model",asrModel);
      const raw = await call("audio/transcriptions",form,false,64_000);
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as {text?:unknown};
      return extractText(parsed.text,TUTOR_MAX_TEXT);
    },
    async reply(profile,history,message,memoryFacts=[]) {
      const raw = await call("chat/completions",JSON.stringify({
        model:textModel,max_tokens:240,
        messages:[
          {role:"system",content:systemInstructions(profile,memoryFacts)},
          ...history.map(m=>({role:m.role,content:m.text})),
          {role:"user",content:message},
        ],
      }),true,64_000);
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as {choices?:Array<{message?:{content?:unknown}}>};
      return extractText(parsed.choices?.[0]?.message?.content,TUTOR_MAX_TEXT);
    },
    async replyWithProposal(profile,history,message,memoryFacts) {
      const raw = await call("chat/completions",JSON.stringify({
        model:textModel,max_tokens:350,response_format:{type:"json_object"},
        messages:[
          {role:"system",content:systemInstructions(profile,memoryFacts,true)},
          ...history.map(m=>({role:m.role,content:m.text})),
          {role:"user",content:message},
        ],
      }),true,64_000);
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as {choices?:Array<{message?:{content?:unknown}}>};
      return parseTutorMemoryEnvelope(extractText(parsed.choices?.[0]?.message?.content,TUTOR_MAX_TEXT),message);
    },
    async speak(text) {
      if (!speechConfigured(env)) return null;
      const raw = await call("audio/speech",JSON.stringify({
        model:env.LINGUA_TUTOR_TTS_MODEL,voice:env.LINGUA_TUTOR_TTS_VOICE || "alloy",
        input:text.slice(0,TUTOR_MAX_TEXT),response_format:"mp3",
      }),true,1_500_000);
      return raw.length ? Buffer.from(raw).toString("base64") : null;
    },
  };
}
