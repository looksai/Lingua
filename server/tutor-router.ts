import {safeTutorModality} from "@shared/pedagogy/tutor-input-modality";
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
import { guardTutorLearnerClaims } from "./tutor-fact-guard";
import { enforceBeginnerPortuguese } from "../shared/tutor-language";
import { needsAbsoluteBeginnerSupport } from "../shared/tutor-language";
import { calEnabled, calTutorSessions } from "./cal-integration";
import {catalogCALRuntimeEnabled,calCatalogTutorSessions} from "./cal-catalog-runtime";
import {getMicrocompetency} from "../shared/pedagogy/microcompetency-catalog";
import {
  memoryFeatureEnabled, learnerMemoryInput, safeLearnerFact, loadLearnerMemories,
  listLearnerMemories, saveLearnerMemory, deleteLearnerMemory, clearLearnerMemories,
} from "./learner-memory";

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
    return {provider:tutorMode(),chat:openai||groq,asr:openai||groq,tts:openai&&speechConfigured(),neuralEnglish:groq,geminiDemo:geminiDemoAllowed(ctx.user.email),memory:memoryFeatureEnabled()};
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
  revokeCatalogConsent:protectedProcedure.mutation(({ctx})=>{
    checkRequestOrigin(ctx.req);
    calCatalogTutorSessions.revoke(ctx.user.id);
    return {revoked:true as const};
  }),
  catalogPendingTask:protectedProcedure.mutation(({ctx})=>{
    checkRequestOrigin(ctx.req);
    if(!catalogCALRuntimeEnabled()||
      !(freeTutorAllowed(ctx.user.email)||paidTutorAllowed(ctx.user.email)))return null;
    return calCatalogTutorSessions.pendingClientTask(ctx.user.id);
  }),
  catalogRenderAck:protectedProcedure.input(z.object({
    consent:z.literal(true),
    sessionId:z.string().min(8).max(100),
    deliveryId:z.string().min(8).max(240),
  })).mutation(({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    // No LLM, billing or learner evidence. Scoped by the authenticated user.
    if(!catalogCALRuntimeEnabled()||
      !(freeTutorAllowed(ctx.user.email)||paidTutorAllowed(ctx.user.email)))
      return {status:"rejected" as const};
    const status=calCatalogTutorSessions.confirmBrowserRender(ctx.user.id,input.sessionId,input.deliveryId);
    return {status};
  }),
  reply:protectedProcedure.input(z.object({consent,provider,voice:z.boolean(),message:z.string().trim().min(1).max(TUTOR_MAX_TEXT),history,
    catalogCompetencyId:z.string().max(90).optional(),
    catalogRestart:z.boolean().optional(),
    // Client hint only; server cannot cryptographically attest ASR origin yet.
    inputModality:z.enum(["typed","asr_text"]).optional()})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(input.catalogRestart===true){
      if(!input.catalogCompetencyId||!getMicrocompetency(input.catalogCompetencyId))
        throw new TRPCError({code:"BAD_REQUEST",message:"O reinício exige um assunto válido do catálogo."});
      // Prevent a stale client from inadvertently starting the legacy Hello pilot.
      if(!catalogCALRuntimeEnabled())
        throw new TRPCError({code:"PRECONDITION_FAILED",message:"O catálogo de atividades não está disponível."});
    }
    const lease=calCatalogTutorSessions.beginTurn(ctx.user.id);
    try {
    const p=await profileFor(ctx.user.id);
    if(!input.consent||input.provider!==tutorMode()||!(paidTutorAllowed(ctx.user.email)||freeTutorAllowed(ctx.user.email)))
      return {text:localReply(input.message),source:"local" as const,audioBase64:null,voiceStatus:input.voice?"unavailable" as const:"off" as const,memoryCandidate:null};
    // Missing/unmigrated memory storage MUST NOT block basic tutoring.
    // Never propose or retrieve memory when disabled. No hidden writes.
    let approvedFacts:string[]=[];
    let memoryReady=false;
    if(memoryFeatureEnabled()){
      try {
        approvedFacts=(await loadLearnerMemories(ctx.user.id)).map(item=>item.fato);
        memoryReady=true;
      } catch {console.warn("[tutor] memory unavailable: feature will fail closed for this turn");}
    }
    return await withTutorBudget(ctx.user.id,async()=>{
      if(!lease.active())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Autorização revogada."});
      // CAL is OFF by default. In the pilot, it is restricted by the same
      // existing authenticated tester allowlist as the external tutor.
      // No DB writes, memory mutations, SRS or CSLE calls.
      const beginner=needsAbsoluteBeginnerSupport(input.history,input.message,approvedFacts);
      // The new catalogue adapter is independently gated. While OFF,
      // CAL_ENABLED=true keeps the existing safe Hello pilot byte-for-byte.
      const catalogPreview=catalogCALRuntimeEnabled()
        ? calCatalogTutorSessions.prepare(ctx.user.id,input.message,beginner,input.catalogCompetencyId,
            safeTutorModality(input.inputModality),input.catalogRestart===true)
        : null;
      // Never allow two different CAL state machines to grade the same turn.
      // A catalogue-mode request with an unknown goal must fall back to
      // ordinary conversation, NEVER involuntarily restart the Hello pilot.
      const calPreview=calEnabled() && !catalogCALRuntimeEnabled()
        ? calTutorSessions.prepare(ctx.user.id,input.message,beginner, safeTutorModality(input.inputModality))
        : null;
      const pedagogicalDirective=catalogPreview?.directive??calPreview?.directive;
      let text:string;
      let memoryCandidate: {fato:string;categoria:"profissao"|"objetivo"|"interesse"|"preferencia_estudo"}|null=null;
      try {
        const adapter=createSelectedTutor(input.provider!);
        if(memoryReady){
          const proposed=await adapter.replyWithProposal(p,input.history,input.message,approvedFacts,pedagogicalDirective);
          text=proposed.text;
          memoryCandidate=proposed.memoryCandidate;
          if(memoryCandidate&&approvedFacts.some(f=>f.trim().toLocaleLowerCase("pt-BR")===memoryCandidate!.fato.toLocaleLowerCase("pt-BR")))
            memoryCandidate=null;
        }else text=await adapter.reply(p,input.history,input.message,approvedFacts,pedagogicalDirective);
      } catch(error) { return {...tutorFailureReply(error,input.message,input.voice),memoryCandidate:null}; }
      if(!lease.active())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Autorização revogada."});
      const checked=guardTutorLearnerClaims(text,input.history,input.message,approvedFacts);
      if(checked.blocked)return {text:checked.text,source:"local" as const,audioBase64:null,voiceStatus:"off" as const,memoryCandidate:null};
      const adapted=enforceBeginnerPortuguese(checked.text,input.history,input.message,approvedFacts);
      if(adapted.corrected)console.warn("[tutor] beginner language guard corrected an English-dominant reply");
      // Only a successful, safe AI reply can commit a provisional CAL turn.
      // An AI-produced sentence is never graded as learner evidence.
      // If the beginner fallback replaced the proposed task, the runtime
      // verifies the actual delivered question before expecting an answer.
      // A legacy beginner-language fallback may contain "Hello" even when
      // the student chose a different catalogue objective. Do not append an
      // unrelated fixed lesson to the selected curriculum.
      const safeBase=catalogPreview && adapted.corrected
        ? "Vamos estudar o assunto escolhido em português, um passo de cada vez."
        : adapted.text;
      const finalText=catalogPreview ? catalogPreview.complete(safeBase) : adapted.text;
      if(!catalogPreview)calPreview?.commit(finalText);
      const catalogTask=catalogPreview
        ? calCatalogTutorSessions.clientTaskForReply(ctx.user.id,finalText)
        : null;
      return {text:finalText,source:"ai" as const,memoryCandidate,catalogTask,
        ...await optionalSpeech(finalText,input.provider==="openai"&&input.voice)};
    });
    } finally {lease.release();}
  }),
  // All memory operations are owned by the authenticated user. Optional
  // and entirely separate from transcript, curriculum and official evidence.
  memoryList:protectedProcedure.query(async ({ctx})=>{
    if(!memoryFeatureEnabled())return [];
    try{return await listLearnerMemories(ctx.user.id);}
    catch{throw new TRPCError({code:"PRECONDITION_FAILED",message:"Memórias indisponíveis até a atualização aprovada do banco."});}
  }),
  memorySave:protectedProcedure.input(learnerMemoryInput).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!memoryFeatureEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Memória de longo prazo desativada."});
    if(!safeLearnerFact(input.fato,input.sourceMessage))throw new TRPCError({code:"BAD_REQUEST",message:"Este trecho não pode ser guardado como memória pessoal."});
    try{return await saveLearnerMemory(ctx.user.id,input);}
    catch{throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível guardar a memória. Nada foi confirmado."});}
  }),
  memoryDelete:protectedProcedure.input(z.object({id:z.number().int().positive()})).mutation(async ({ctx,input})=>{
    checkRequestOrigin(ctx.req);
    if(!memoryFeatureEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Memórias desativadas."});
    try{return await deleteLearnerMemory(ctx.user.id,input.id);}
    catch{throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível apagar esta memória."});}
  }),
  memoryClear:protectedProcedure.mutation(async ({ctx})=>{
    checkRequestOrigin(ctx.req);
    if(!memoryFeatureEnabled())throw new TRPCError({code:"PRECONDITION_FAILED",message:"Memórias desativadas."});
    try{return await clearLearnerMemories(ctx.user.id);}
    catch{throw new TRPCError({code:"PRECONDITION_FAILED",message:"Não foi possível apagar as memórias."});}
  }),
});
