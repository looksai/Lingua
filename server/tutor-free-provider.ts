import { needsAbsoluteBeginnerSupport } from "../shared/tutor-language";
import { parseTutorMemoryEnvelope } from "./learner-memory";
import { TUTOR_MAX_AUDIO_BYTES,TUTOR_MAX_TEXT,systemInstructions,type TutorAudioType,type TutorHistory,type TutorProfile } from "../shared/tutor";

const GROQ="https://api.groq.com/openai/v1/";
export const GROQ_RATE_LIMIT_MESSAGE="O tutor está descansando. Tente novamente em alguns minutos.";
export class GroqRateLimitError extends Error {constructor(){super("Groq rate limit");this.name="GroqRateLimitError";}}
export function isGroqRateLimitError(error:unknown):error is GroqRateLimitError{return error instanceof GroqRateLimitError;}
const GOOGLE="https://generativelanguage.googleapis.com/v1beta/interactions";
export const GEMINI_TEST_PHRASES = [
  "Hello! Let's practice English together.",
  "I work as a welder. I use MIG and TIG welding.",
  "Olá! Vamos praticar inglês. Repita comigo: Good morning. How are you?",
] as const;
const extension:Record<TutorAudioType,string>={"audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/wav":"wav"};

async function requestJson(url:string,headers:Record<string,string>,body:BodyInit,request:typeof fetch,cap:number,provider:string):Promise<unknown>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25_000);
  try {
    const res=await request(url,{method:"POST",headers,body,signal:controller.signal,redirect:"error"});
    if(!res.ok){
      await res.body?.cancel();
      console.warn("[tutor-free] provider="+provider+" status="+res.status);
      if(provider.startsWith("groq-")&&res.status===429)throw new GroqRateLimitError();
      throw Error("provider rejected request");
    }
    const reader=res.body?.getReader();
    if(!reader)throw Error("empty provider response");
    const chunks:Uint8Array[]=[];let size=0;
    try{
      for(;;){
        const next=await reader.read();if(next.done)break;
        size+=next.value.length;
        if(size>cap){await reader.cancel();throw Error("provider response too large");}
        chunks.push(next.value);
      }
    }finally{reader.releaseLock();}
    return JSON.parse(Buffer.concat(chunks,size).toString("utf8"));
  }catch(error){
    if(controller.signal.aborted)console.warn("[tutor-free] provider="+provider+" timeout");
    throw error;
  }finally{clearTimeout(timeout);}
}
function textResult(value:unknown,cap=TUTOR_MAX_TEXT){
  if(typeof value!=="string"||!value.trim())throw Error("empty provider text");
  return value.trim().slice(0,cap);
}
export function createGroqTutor(env=process.env,request:typeof fetch=fetch){
  const key=env.GROQ_API_KEY;
  const headers=()=>{if(!key)throw Error("Groq unavailable");return {Authorization:"Bearer "+key};};
  const model=env.LINGUA_GROQ_TEXT_MODEL||"openai/gpt-oss-120b";
  const asr=env.LINGUA_GROQ_ASR_MODEL||"whisper-large-v3-turbo";
  return {
    async reply(profile:TutorProfile,history:TutorHistory[],message:string,memoryFacts:readonly string[]=[]){
      const raw=await requestJson(GROQ+"chat/completions",{...headers(),"Content-Type":"application/json"},JSON.stringify({
        model,max_completion_tokens:768,temperature:0.6,
        ...(model.startsWith("openai/gpt-oss-")?{reasoning_effort:"low",include_reasoning:false}:{}),
        messages:[{role:"system",content:systemInstructions(profile,memoryFacts,false,needsAbsoluteBeginnerSupport(history,message,memoryFacts))},...history.map(m=>({role:m.role,content:m.text})),{role:"user",content:message}]
      }),request,64_000,"groq-chat") as {choices?:Array<{message?:{content?:unknown}}>};
      return textResult(raw.choices?.[0]?.message?.content);
    },
    async replyWithProposal(profile:TutorProfile,history:TutorHistory[],message:string,memoryFacts:readonly string[]){
      const raw=await requestJson(GROQ+"chat/completions",{...headers(),"Content-Type":"application/json"},JSON.stringify({
        model,max_completion_tokens:850,temperature:0.3,response_format:{type:"json_object"},
        ...(model.startsWith("openai/gpt-oss-")?{reasoning_effort:"low",include_reasoning:false}:{}),
        messages:[{role:"system",content:systemInstructions(profile,memoryFacts,true,needsAbsoluteBeginnerSupport(history,message,memoryFacts))},...history.map(m=>({role:m.role,content:m.text})),{role:"user",content:message}]
      }),request,64_000,"groq-chat") as {choices?:Array<{message?:{content?:unknown}}>};
      return parseTutorMemoryEnvelope(textResult(raw.choices?.[0]?.message?.content,3000),message);
    },
    async transcribe(bytes:Uint8Array,mime:TutorAudioType){
      if(!bytes.length||bytes.length>TUTOR_MAX_AUDIO_BYTES)throw Error("invalid audio size");
      const form=new FormData();
      form.append("file",new Blob([new Uint8Array(bytes)],{type:mime}),"recording."+extension[mime]);
      form.append("model",asr);form.append("response_format","json");
      const raw=await requestJson(GROQ+"audio/transcriptions",headers(),form,request,64_000,"groq-asr") as {text?:unknown};
      return textResult(raw.text);
    }
  };
}

// Only fixed, nonpersonal, fictional text is eligible for the unpaid Gemini API.
// Never forward the profile, tutor name, conversation, recording or generated reply.
export async function geminiTestSpeech(index:number,env=process.env,request:typeof fetch=fetch){
  const phrase=GEMINI_TEST_PHRASES[index];
  if(!phrase||!env.GEMINI_API_KEY)throw Error("Gemini demo unavailable");
  const model=env.LINGUA_GEMINI_TTS_MODEL||"gemini-3.8-flash-lite-tts";
  if(!["gemini-3.8-flash-lite-tts","gemini-3.8-flash-tts"].includes(model))throw Error("unsupported Gemini TTS model");
  const raw=await requestJson(GOOGLE,{"x-goog-api-key":env.GEMINI_API_KEY,"Content-Type":"application/json"},JSON.stringify({
    model,store:false,input:[{type:"user_input",content:[{type:"text",text:phrase}]}],
    response_format:{type:"audio"},generation_config:{speech_config:[{voice:"Kore"}]}
  }),request,3_000_000,"gemini-demo-tts") as {steps?:Array<{type?:string;content?:Array<{type?:string;data?:unknown}>}>};
  const audio=raw.steps?.filter(s=>s.type==="model_output").flatMap(s=>s.content??[]).filter(c=>c.type==="audio").at(-1)?.data;
  if(typeof audio!=="string"||audio.length>2_000_000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(audio))throw Error("invalid Gemini audio");
  const bytes=Buffer.from(audio,"base64");
  if(bytes.length<=44||bytes.length>1_500_000||bytes.subarray(0,4).toString()!=="RIFF"||bytes.subarray(8,12).toString()!=="WAVE")throw Error("expected WAV audio");
  return {text:phrase,audioBase64:bytes.toString("base64"),audioMime:"audio/wav" as const};
}
