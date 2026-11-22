import {GroqRateLimitError} from "./tutor-free-provider";

// Groq Orpheus V1 English: https://console.groq.com/docs/text-to-speech/orpheus
// NOT playai-tts, which shut down in 2025. English only, <=200 characters, WAV.
export const GROQ_ENGLISH_VOICES = ["troy","daniel","austin","autumn","diana","hannah"] as const;
export type GroqEnglishVoice = typeof GROQ_ENGLISH_VOICES[number];

const ENDPOINT="https://api.groq.com/openai/v1/audio/speech";
const MODEL="canopylabs/orpheus-v1-english";
const MAX_SPEECH_BYTES=1_500_000;

export type GroqTtsBadRequestReason="voice"|"model"|"format"|"input"|"access"|"unknown";
export class GroqTtsBadRequest extends Error {
  constructor(readonly reason:GroqTtsBadRequestReason) {
    super("Groq TTS rejected a parameter");
    this.name="GroqTtsBadRequest";
  }
}
// Categorize the provider's 400 response without ever logging or returning
// its raw message, which might echo a learner's request or a secret.
async function categorize400(res:Response):Promise<GroqTtsBadRequestReason>{
  const reader=res.body?.getReader();if(!reader)return "unknown";
  const chunks:Uint8Array[]=[];let count=0;
  try {
    for(;;){
      const item=await reader.read();if(item.done)break;
      count+=item.value.byteLength;
      if(count>4_096){await reader.cancel();return "unknown";}
      chunks.push(item.value);
    }
  }catch{return "unknown";}
  finally{reader.releaseLock();}
  let parsed:unknown;
  try{parsed=JSON.parse(Buffer.concat(chunks,count).toString("utf8"));}
  catch{return "unknown";}
  if(!parsed||typeof parsed!=="object"||!("error" in parsed))return "unknown";
  const error=(parsed as {error?:unknown}).error;
  if(!error||typeof error!=="object")return "unknown";
  const data=error as {message?:unknown;type?:unknown;code?:unknown;param?:unknown};
  const message=typeof data.message==="string"?data.message.slice(0,2048):"";
  const parameter=typeof data.param==="string"?data.param:"";
  const dataCode=typeof data.code==="string"?data.code:"";
  const inspect=[parameter,dataCode,message].join(" ").toLowerCase();
  if(/\b(voice|speaker|persona)\b/.test(inspect))return "voice";
  if(/\b(model|orpheus|model_id)\b/.test(inspect))return "model";
  if(/\b(response_format|format|wav|audio format)\b/.test(inspect))return "format";
  if(/\b(input|characters?|length|text|tokens?|content)\b/.test(inspect))return "input";
  if(/\b(access|permission|project|account|organization|disabled|restricted|not available)\b/.test(inspect))return "access";
  return "unknown";
}


export async function synthesizeEnglish(
  text:string,
  voice:GroqEnglishVoice,
  env=process.env,
  request:typeof fetch=fetch
):Promise<{audioBase64:string;audioMime:"audio/wav";text:string}>{
  if(!env.GROQ_API_KEY)throw Error("TTS unavailable");
  if(!GROQ_ENGLISH_VOICES.includes(voice))throw Error("invalid voice");
  if(!text.trim()||text.length>200||/[\u0000-\u001f]/.test(text))throw Error("TTS text outside bounds");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18_000);
  try{
    const res=await request(ENDPOINT,{
      method:"POST",redirect:"error",signal:controller.signal,
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+env.GROQ_API_KEY},
      body:JSON.stringify({model:MODEL,input:text,voice,response_format:"wav"})
    });
    if(!res.ok){
      const reason=res.status===400?await categorize400(res):(await res.body?.cancel(),"unknown");
      console.warn("[tutor-tts] status="+res.status+(res.status===400?" category="+reason:""));
      if(res.status===429)throw new GroqRateLimitError();
      if(res.status===400)throw new GroqTtsBadRequest(reason);
      throw Error("TTS rejected request");
    }
    const reader=res.body?.getReader();
    if(!reader)throw Error("TTS returned no audio");
    const chunks:Uint8Array[]=[];let size=0;
    try{
      for(;;){
        const item=await reader.read();
        if(item.done)break;
        size+=item.value.length;
        if(size>MAX_SPEECH_BYTES){await reader.cancel();throw Error("TTS response exceeds limit");}
        chunks.push(item.value);
      }
    }finally{reader.releaseLock();}
    const raw=Buffer.concat(chunks,size);
    if(raw.length<44||raw.subarray(0,4).toString()!=="RIFF"||raw.subarray(8,12).toString()!=="WAVE")
      throw Error("TTS did not return WAV");
    return {audioBase64:raw.toString("base64"),audioMime:"audio/wav",text};
  }catch(error){
    if(controller.signal.aborted)console.warn("[tutor-tts] timeout");
    throw error;
  }finally{clearTimeout(timeout);}
}
