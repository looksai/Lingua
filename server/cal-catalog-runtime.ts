/**
 * Fase 01: opt-in catalogue CAL controller for tutor.reply.
 * CAL_CATALOG_ENABLED off by default, additionally requires CAL_ENABLED=true.
 * In-process, per-authenticated-user, TTL 30m. No DB/SRS/CSLE/learnerEvidences.
 * A delivery ACK here attests SERVER response assembly, NOT browser receipt.
 */
import {randomUUID} from "node:crypto";
import type {CatalogClientTask} from "../shared/pedagogy/cal-client-delivery";
import {
  newCatalogCALSession,chooseCatalogObjective,issueCatalogTask,
  attestCatalogTaskDelivery,respondToCatalogTask,resumeCatalogSession,
  listCatalogOptions,type CatalogCALSession,
} from "../shared/pedagogy/cal-catalog-adapter";
import {getMicrotask,getMicrocompetency,MICRO_TASKS,evaluateClosedMicrotask} from "../shared/pedagogy/microcompetency-catalog";
import {TUTOR_MAX_TEXT} from "../shared/tutor";

const LIMIT=100,TTL_MS=30*60_000;
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
const HELP=/^(?:n[aã]o sei|n[aã]o entendi|n[aã]o consigo|ajuda|me ajuda|repete|de novo)[.!? ]*$/iu;
const PAUSE=/^(?:quero parar|parar|pare|pausa|chega por hoje|at[eé] depois|encerrar aula)[.!? ]*$/iu;
const RESUME=/^(?:continuar|vamos continuar|retomar|voltar para a aula)[.!? ]*$/iu;
const GOAL_VERB=/\b(?:quero|gostaria|preciso|ensina|ensine|aprender|praticar|estudar|treinar|dizer|falar|perguntar|cumprimentar)\b/u;

export function catalogCALRuntimeEnabled(env:NodeJS.ProcessEnv=process.env):boolean {
  return env.CAL_ENABLED==="true" && env.CAL_CATALOG_ENABLED==="true";
}
/** A biographical statement or generic question is not a learning objective. */
export function explicitCatalogGoal(message:string):string|null {
  const t=normalize(message);
  if(!GOAL_VERB.test(t))return null;
  if(/\b(?:profissao|ocupacao|o que voce faz|com o que voce trabalha)\b/u.test(t) &&
     /\b(?:perguntar|pergunta|questionar)\b/u.test(t))return "conversation.what-do-you-do";
  if(/\b(?:soldador|solda|welder|minha profissao|falar da profissao)\b/u.test(t))
    return "work.welder-example";
  if(/\b(?:meu nome|seu nome|me apresentar|apresentacao pessoal|apresentar meu nome)\b/u.test(t))
    return "identity.my-name";
  if(/\b(?:bom dia|good morning)\b/u.test(t))return "greeting.good-morning";
  if(/\b(?:despedida|adeus|goodbye)\b/u.test(t))return "greeting.goodbye";
  if(/\b(?:por favor|please)\b/u.test(t))return "courtesy.please";
  if(/\b(?:obrigado|obrigada|agradecer|agradecimento|thank you)\b/u.test(t))
    return "courtesy.thank-you";
  if(/\b(?:hello|ola|cumprimento|cumprimentar|saudacao)\b/u.test(t))
    return "greeting.hello";
  return null;
}
function wantsMenu(message:string) {
  const t=normalize(message);
  return /\b(?:aprender|estudar|praticar|treinar|comecar|ensinar)\b/u.test(t) &&
    /\b(?:ingles|english|idioma|do zero)\b/u.test(t);
}
function serverMenu():string {
  const ids=["greeting.hello","identity.my-name","work.welder-example","courtesy.please"];
  const labels=listCatalogOptions().filter(x=>ids.includes(x.competencyId))
    .map(x=>x.titlePt.toLocaleLowerCase("pt-BR"));
  return [
    "Podemos começar pelo assunto que mais interessa a você.",
    "Escolha um: "+labels.join("; ")+".",
    "Por exemplo: \"Quero aprender a falar da minha profissão\" ou \"Quero aprender a me apresentar\".",
    "Esses são exercícios iniciais, não uma avaliação de nível.",
  ].join("\n");
}
function directive(phase:string,goal:string|null,reason:string):string {
  return [
    "[MODO CAL-CATÁLOGO: diretiva de servidor Lingua, habilitada por flag separada.]",
    "Estado: "+phase+". Objetivo curricular: "+(goal??"não escolhido")+". Situação: "+reason+".",
    "O SERVIDOR anexará uma tarefa versionada após sua resposta.",
    "Responda ao aluno em português claro, em UMA frase breve, sem perguntas ou exercícios próprios.",
    "Nunca invente nome, profissão, certificação, nota, CEFR, SRS, pronúncia ou domínio.",
    "Dificuldade é oportunidade de reensino, não prova de incapacidade.",
  ].join("\n");
}
function appendSafely(modelText:string,serverText:string):string {
  const suffix=serverText.trim();
  if(!suffix)return modelText;
  // Never truncate a versioned task. Fail closed on impossible catalogue data.
  if(suffix.length>=TUTOR_MAX_TEXT)return modelText;
  const budget=TUTOR_MAX_TEXT-suffix.length-2;
  const model=modelText.trim().slice(0,budget).trim();
  return model?model+"\n\n"+suffix:suffix;
}
type Entry={session:CatalogCALSession;lastActive:number;renderedDeliveryId:string|null};
export type CatalogRuntimePreview=Readonly<{
  directive:string;
  /** Commit AFTER the protected tutor route validates the LLM reply. */
  complete:(safeModelText:string)=>string;
}>;
export class CALCatalogTutorSessions {
  private readonly entries=new Map<number,Entry>();
  constructor(private readonly now:()=>number=Date.now){}
  private cleanup(time:number){
    for(const [id,entry] of this.entries)
      if(time-entry.lastActive>=TTL_MS)this.entries.delete(id);
    while(this.entries.size>LIMIT){
      const first=this.entries.keys().next().value;
      if(first===undefined)break;
      this.entries.delete(first);
    }
  }
  hasSession(userId:number):boolean {
    const e=this.entries.get(userId);
    if(!e)return false;
    if(this.now()-e.lastActive>=TTL_MS){this.entries.delete(userId);return false;}
    return true;
  }
  inspectForTest(userId:number):CatalogCALSession|null {
    return this.hasSession(userId)?this.entries.get(userId)!.session:null;
  }
  /** A pending task may be re-rendered after a refresh while this in-process session exists. */
  pendingClientTask(userId:number):CatalogClientTask|null {
    if(!this.hasSession(userId))return null;
    const current=this.entries.get(userId)!.session;
    const task=current.task;
    if(current.cal.status!=="active"||!task?.delivered)return null;
    return {sessionId:current.sessionId,deliveryId:task.deliveryId,
      taskId:task.taskId,taskVersion:task.taskVersion,promptText:task.promptText};
  }
  /** Server-bound descriptor: the reply must contain the exact delivered task suffix. */
  clientTaskForReply(userId:number,replyText:string):CatalogClientTask|null {
    const task=this.pendingClientTask(userId);
    if(!task)return null;
    if(replyText!==task.promptText&&!replyText.endsWith("\n\n"+task.promptText))return null;
    return task;
  }
  /** Reports DOM-rendering on an authenticated browser, NOT a human reading receipt. */
  confirmBrowserRender(userId:number,sessionId:string,deliveryId:string):"recorded"|"duplicate"|"rejected" {
    if(!this.hasSession(userId))return "rejected";
    const entry=this.entries.get(userId)!;
    const session=entry.session,task=session.task;
    if(session.ownerUserId!==userId||session.sessionId!==sessionId||
      !task?.delivered||task.deliveryId!==deliveryId)return "rejected";
    if(entry.renderedDeliveryId===deliveryId)return "duplicate";
    entry.renderedDeliveryId=deliveryId;
    entry.lastActive=this.now();
    return "recorded";
  }
  prepare(
    userId:number,message:string,needsPortugueseSupport:boolean,
    selectedId:string|undefined,modality:"typed"|"asr_text",
  ):CatalogRuntimePreview|null {
    if(!Number.isSafeInteger(userId)||userId<=0)return null;
    const time=this.now();
    this.cleanup(time);
    const previous=this.entries.get(userId);
    let state=previous?.session??newCatalogCALSession(userId,randomUUID());
    let suffix="",reason="",shouldStore=false;
    const objective=selectedId||explicitCatalogGoal(message);
    if(objective) {
      const chosen=chooseCatalogObjective(state,userId,objective);
      if(chosen.outcome==="rejected")return null;
      state=chosen.session;
      if(chosen.outcome==="bypassed" && state.task?.delivered)return null;
      reason="objective_selected";shouldStore=true;
    } else if(PAUSE.test(message) && previous){
      const p=respondToCatalogTask(state,userId,{kind:"pause",attemptedAtMs:time});
      if(p.outcome!=="accepted")return null;
      state=p.session;reason="paused";
      suffix="Tudo bem. Quando quiser, diga \"continuar\" para retomar.";
      shouldStore=true;
    } else if(RESUME.test(message) && previous){
      const p=resumeCatalogSession(state,userId);
      if(p.outcome!=="accepted")return null;
      state=p.session;reason="resumed";shouldStore=true;
    } else if(previous && state.cal.status==="active" && HELP.test(message)){
      const p=respondToCatalogTask(state,userId,{kind:"help",attemptedAtMs:time});
      if(p.outcome!=="accepted")return null;
      state=p.session;reason="help_requested";shouldStore=true;
    } else if(previous && state.cal.status==="active" && state.task?.delivered &&
      previous.renderedDeliveryId===state.task.deliveryId &&
      modality==="typed" && !message.includes("?")){
      const task=getMicrotask(state.task.taskId);
      // Unknown free text/questions cannot be graded as wrong attempts.
      if(!task)return null;
      const candidate=evaluateClosedMicrotask(task,message,"typed");
      if(candidate.outcome==="not_evaluable")return null;
      // A recognized answer for an unrelated learning DOMAIN may be a
      // greeting, a topic change, or a new question — not a wrong attempt.
      // Only a lexical distractor from the SAME domain can count as error.
      if(candidate.outcome==="not_yet"){
        const domain=getMicrocompetency(task.competencyId)?.domain;
        const answer=normalize(message).replace(/[.!?,;:]+/g,"").trim();
        const sameDomainDistractor=MICRO_TASKS.some(other=>
          other.id!==task.id && other.mode===task.mode &&
          getMicrocompetency(other.competencyId)?.domain===domain &&
          other.acceptedAnswers.some(value=>
            normalize(value).replace(/[.!?,;:]+/g,"").trim()===answer));
        if(!sameDomainDistractor)return null;
      }
      const p=respondToCatalogTask(state,userId,{
        kind:"explicit_answer",text:message,modality:"typed",attemptedAtMs:time,
      });
      if(p.outcome!=="accepted")return null;
      const wasPractice=state.cal.phase==="PRATICAR";
      state=p.session;reason=p.reason;shouldStore=true;
      if(wasPractice && p.candidate?.outcome==="meets")
        suffix="Boa prática guiada! Isso ainda não comprova domínio ou retenção. Quer escolher outro assunto?";
    } else if(!previous && wantsMenu(message)){
      return {directive:directive("OBSERVAR",null,"offer_choice_not_automatic_enrolment"),
        complete:(safe)=>appendSafely(safe,serverMenu())};
    } else return null;

    // Pause or completed assisted practice: do not create another automatic task.
    if(state.cal.status==="active" && !suffix && !state.task){
      const issued=issueCatalogTask(state,userId,needsPortugueseSupport);
      if(issued.outcome!=="accepted"||!issued.session.task)return null;
      state=issued.session;
      reason+=";task_planned";
    }
    const planned=state,task=planned.task;
    const expectedPrevious=previous;
    const appendix=(task && !task.delivered)?task.promptText:suffix;
    if(!appendix && !shouldStore)return null;
    return {
      directive:directive(planned.cal.phase,planned.selectedCompetencyId,reason),
      complete:(safeModelText:string):string=>{
        // Do not show a task whose ticket lost the concurrency race:
        // the learner would answer an exercise the server no longer owns.
        if(this.entries.get(userId)!==expectedPrevious)return safeModelText;
        const reply=appendSafely(safeModelText,appendix);
        if(task && !task.delivered && !reply.endsWith(task.promptText))
          return safeModelText;
        let finalState=planned;
        if(task && !task.delivered) {
          const confirmed=attestCatalogTaskDelivery(planned,userId,task.deliveryId,task.promptText,time);
          if(confirmed.outcome!=="accepted")return safeModelText;
          finalState=confirmed.session;
        }
        // CAS: concurrent or late model completions never overwrite newer turns.
        if(this.entries.get(userId)!==expectedPrevious)return safeModelText;
        const renderedDeliveryId=finalState.task?.deliveryId===previous?.session.task?.deliveryId
          ? previous?.renderedDeliveryId??null : null;
        this.entries.delete(userId);
        this.entries.set(userId,{session:finalState,lastActive:this.now(),renderedDeliveryId});
        this.cleanup(this.now());
        return reply;
      },
    };
  }
}
export const calCatalogTutorSessions=new CALCatalogTutorSessions();
