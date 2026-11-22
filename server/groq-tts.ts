import {GroqRateLimitError} from "./tutor-free-provider";

// Groq Orpheus V1 English: https://console.groq.com/docs/text-to-speech/orpheus
// NOT playai-tts, which shut down in 2025. English only, <=200 characters, WAV.
export const GROQ_ENGLISH_VOICES = ["troy","daniel","austin","autumn","diana","hannah"] as const;
export type GroqEnglishVoice = typeof GROQ_ENGLISH_VOICES[number];

const ENDPOINT="https://api.groq.com/openai/v1/audio/speech";
const MODEL="canopylabs/orpheus-v1-english";
const MAX_SPEECH_BYTES=1_500_000;

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
      await res.body?.cancel();
      console.warn("[tutor-tts] status="+res.status);
      if(res.status===429)throw new GroqRateLimitError();
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
