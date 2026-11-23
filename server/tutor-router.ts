import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { learnerProfiles } from "../drizzle/schema";
import { getDb } from "./db";
import { checkRequestOrigin } from "./auth-local";
import { router, protectedProcedure } from "./_core/trpc";
import { greeting, localReply, TUTOR_MAX_TEXT, TUTOR_MAX_HISTORY, TUTOR_MAX_AUDIO_BYTES,
  tutorAudioTypes, type TutorProfile } from "../shared/tutor";
import { createOpenAITutor, speechConfigured } from "./tutor-provider";
import { paidTutorAllowed, freeTutorAllowed, geminiDemoAllowed, tutorMode, withTutorBudget } from "./tutor-budget";
import { geminiTestSpeech, GEMINI_TEST_PHRASES, GROQ_RATE_LIMIT_MESSAGE, isGroqRateLimitError } from "./tutor-free-provider";
import { createSelectedTutor } from "./tutor-provider-selector";
import { tutorFailureReply } from "./tutor-fallback";
import { GROQ_ENGLISH_VOICES, GroqTtsBadRequest, type GroqTtsBadRequestReason } from "./groq-tts";
import { createVoiceProvider } from "./voice-provider";
import { memoryWriteEnabled, recentConfirmedMemories } from "./learner-memory-router";
import { issueMemoryProposal, type MemoryFact } from "./learner-memory-logic";
import { guardTutorLearnerClaims } from "./tutor-fact-guard";

async function profileFor(userId:number): Promise<TutorProfile> {
  const db = await getDb();
  if (!db) throw new TRPCError({code:"PRECONDITION_FAILED",message:"Perfil temporariamente indisponível."});
  const [p] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId,userId)).limit(1);
  if (!p) throw new TRPCError({code:"PRECONDITION_FAILED",message:"Configure seu tutor primeiro."});
  return {tutorName:p.tutorName,tutorPersona:p.tutorPersona,interest:p.interest};
}
const history = z.array(z.object({
  role:z.enum(["user","assistant"]),
  text:z.string().trim().min(1).max(TUTOR_MAX_TEXT),
})).max(TUTOR_MAX_HISTORY);
const consent = z.boolean();
const provider = z.enum(["groq","openai","off"]).optional();
const audioSchema = z.object({
  mime:z.enum(tutorAudioTypes),
  base64:z.string().min(4).max(Math.ceil(TUTOR_MAX_AUDIO_BYTES/3)*4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
type AudioResult = {audioBase64:string|null; voiceStatus:"ready"|"unavailable"|"off"};
async function optionalSpeech(text:string, requested:boolean):Promise<AudioResult> {
  if(!requested) return {audioBase64:null,voiceStatus:"off"};
  try {
    const audioBase64 = await createOpenAITutor().speak(text);
    return {audioBase64,voiceStatus:audioBase64?"ready":"unavailable"};
  } catch {return {audioBase64:null,voiceStatus:"unavailable"};}
}
export const tutorRouter = router({
  capabilities:protectedProcedure.query(({ctx})=>{
    const openai=paidTutorAllowed(ctx.user.email), groq=freeTutorAllowed(ctx.user.email);
    return {provider:tutorMode(),chat:openai||groq,asr:openai||groq,tts:openai&&speechConfigured(),neuralEnglish:groq,geminiDemo:geminiDemoAllowed(ctx.user.email),longTermMemory:memoryWriteEnabled(ctx.user.email)};
  }),
  welcomeAudio:protectedProcedure.input(z.object({consent,provider})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if (input.provider!=="openai" || !input.consent || !paidTutorAllowed(ctx.user.email) || !speechConfigured())
      return {audioBase64:null,voiceStatus:"unavailable" as const,text:null};
    const profile=await profileFor(ctx.user.id);
    const text=greeting(profile);
    return withTutorBudget(ctx.user.id,async()=>({text,...await optionalSpeech(text,true)}));
  }),
  transcribe:protectedProcedure.input(z.object({consent,provider,audio:audioSchema})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!input.consent||input.provider!==tutorMode()||!(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email)))
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Transcrição indisponível. Autorize a IA e use uma conta de teste habilitada."});
    await profileFor(ctx.user.id);
    const bytes=Buffer.from(input.audio.base64,"base64");
    if (!bytes.length||bytes.length>TUTOR_MAX_AUDIO_BYTES||bytes.toString("base64")!==input.audio.base64)
      throw new TRPCError({code:"BAD_REQUEST",message:"Gravação inválida ou grande demais."});
    return withTutorBudget(ctx.user.id,async()=>{
      try{
        const adapter=createSelectedTutor(input.provider!);
        return {text:await adapter.transcribe(bytes,input.audio.mime)};
      }catch(error){
        if(isGroqRateLimitError(error))throw new TRPCError({code:"TOO_MANY_REQUESTS",message:GROQ_RATE_LIMIT_MESSAGE});
        throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível transcrever. Tente novamente ou digite a mensagem."});
      }
    });
  }),
  neuralEnglish:protectedProcedure.input(z.object({
    consent:z.literal(true),provider:z.literal("groq"),
    text:z.string().trim().min(4).max(200),
    voice:z.enum(GROQ_ENGLISH_VOICES),
  })).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!freeTutorAllowed(ctx.user.email)||tutorMode()!=="groq")
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Voz neural de inglês indisponível."});
    await profileFor(ctx.user.id);
    return withTutorBudget(ctx.user.id,async()=>{
      try{return await createVoiceProvider("groq").synthesize({text:input.text,voice:input.voice,language:"en-US",format:"wav"});}
      catch(error){
        if(isGroqRateLimitError(error))throw new TRPCError({code:"TOO_MANY_REQUESTS",message:GROQ_RATE_LIMIT_MESSAGE});
        if(error instanceof GroqTtsBadRequest) {
          const reason:Record<GroqTtsBadRequestReason,string>={
            voice:"identificador de voz",model:"modelo Orpheus",format:"formato de áudio",
            input:"texto de entrada",access:"permissão da conta Groq",unknown:"motivo não identificado"
          };
          throw new TRPCError({code:"PRECONDITION_FAILED",
            message:"Groq recusou a voz neural (HTTP 400): "+reason[error.reason]+". Nenhum áudio foi gerado."});
        }
        throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível gerar a voz neural. Não houve troca automática de provedor."});
      }
    });
  }),
  geminiDemo:protectedProcedure.input(z.object({consent:z.literal(true),phraseIndex:z.number().int().min(0).max(GEMINI_TEST_PHRASES.length-1)})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!geminiDemoAllowed(ctx.user.email))throw new TRPCError({code:"PRECONDITION_FAILED",message:"Demonstração de voz indisponível."});
    return withTutorBudget(ctx.user.id,async()=>{
      try{return await geminiTestSpeech(input.phraseIndex);}catch{throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível gerar o áudio de teste."});}
    });
  }),
  reply:protectedProcedure.input(z.object({consent,provider,voice:z.boolean(),message:z.string().trim().min(1).max(TUTOR_MAX_TEXT),history})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    const p=await profileFor(ctx.user.id);
    if(!input.consent||input.provider!==tutorMode()||!(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email)))
      return {text:localReply(input.message),source:"local" as const,audioBase64:null,voiceStatus:input.voice?"unavailable" as const:"off" as const,memoryProposal:null};
    return withTutorBudget(ctx.user.id,async()=>{
      const memoryOn=input.provider==="groq"&&memoryWriteEnabled(ctx.user.email);
      let memories:MemoryFact[]=[];
      if(memoryOn){
        try{memories=await recentConfirmedMemories(ctx.user.id);}
        catch{console.warn("[tutor-memory] safe retrieval unavailable; chat continues without stored facts");}
      }
      let text:string;
      let candidate:MemoryFact|null=null;
      try {
        const adapter=createSelectedTutor(input.provider!);
        if(memoryOn&&input.provider==="groq"&&"replyWithMemory" in adapter){
          const result=await adapter.replyWithMemory(p,input.history,input.message,memories);
          text=result.text;candidate=result.candidate;
        }else text=await adapter.reply(p,input.history,input.message);
      }catch(error) {
        return {...tutorFailureReply(error,input.message,input.voice),memoryProposal:null};
      }
      // Confirmed quotes may serve as prior student-authored evidence. The
      // assistant's own previous messages are never treated as facts.
      const factualHistory=[...input.history,...memories.map(m=>({role:"user" as const,text:m.fato}))];
      const checked=guardTutorLearnerClaims(text,factualHistory,input.message);
      if(checked.blocked)return {text:checked.text,source:"local" as const,audioBase64:null,voiceStatus:"off" as const,memoryProposal:null};
      const memoryProposal=memoryOn&&candidate?
        issueMemoryProposal(ctx.user.id,candidate,process.env.MANUS_JWT_SECRET??""):null;
      return {text:checked.text,source:"ai" as const,
        ...await optionalSpeech(checked.text,input.provider==="openai"&&input.voice),
        memoryProposal};
    });
  }),
});
