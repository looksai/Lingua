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
import { paidTutorAllowed, withTutorBudget } from "./tutor-budget";

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
    const allowed=paidTutorAllowed(ctx.user.email);
    return {chat:allowed,asr:allowed,tts:allowed&&speechConfigured()};
  }),
  welcomeAudio:protectedProcedure.input(z.object({consent})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if (!input.consent || !paidTutorAllowed(ctx.user.email) || !speechConfigured())
      return {audioBase64:null,voiceStatus:"unavailable" as const};
    const profile=await profileFor(ctx.user.id);
    return withTutorBudget(ctx.user.id,()=>optionalSpeech(greeting(profile),true));
  }),
  transcribe:protectedProcedure.input(z.object({consent,audio:audioSchema})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!input.consent||!paidTutorAllowed(ctx.user.email))
      throw new TRPCError({code:"PRECONDITION_FAILED",message:"Transcrição indisponível. Autorize a IA e use uma conta de teste habilitada."});
    await profileFor(ctx.user.id);
    const bytes=Buffer.from(input.audio.base64,"base64");
    if (!bytes.length||bytes.length>TUTOR_MAX_AUDIO_BYTES||bytes.toString("base64")!==input.audio.base64)
      throw new TRPCError({code:"BAD_REQUEST",message:"Gravação inválida ou grande demais."});
    return withTutorBudget(ctx.user.id,async()=>{
      try{
        return {text:await createOpenAITutor().transcribe(bytes,input.audio.mime)};
      }catch{
        throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível transcrever. Tente novamente ou digite a mensagem."});
      }
    });
  }),
  reply:protectedProcedure.input(z.object({consent,voice:z.boolean(),message:z.string().trim().min(1).max(TUTOR_MAX_TEXT),history})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    const p=await profileFor(ctx.user.id);
    if(!input.consent||!paidTutorAllowed(ctx.user.email))
      return {text:localReply(input.message),source:"local" as const,audioBase64:null,voiceStatus:input.voice?"unavailable" as const:"off" as const};
    return withTutorBudget(ctx.user.id,async()=>{
      let text:string;
      try { text=await createOpenAITutor().reply(p,input.history,input.message); }
      catch { return {text:localReply(input.message),source:"local" as const,audioBase64:null,voiceStatus:input.voice?"unavailable" as const:"off" as const}; }
      return {text,source:"ai" as const,...await optionalSpeech(text,input.voice)};
    });
  }),
});
