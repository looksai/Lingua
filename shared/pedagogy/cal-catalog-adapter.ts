/**
 * Pure catalogue → CAL adapter laboratory (Fase 01).
 * Depends on the UNMERGED catalogue PR; not imported by the real tutor.
 * The future trusted host must authenticate accounts and attest delivery.
 * No LLM, database, SRS, CSLE, timers or personal biography here.
 */
import {
  newCALSession, stepCAL, chooseCALPlan, summarizeCAL,
  type CALSnapshot, type CALState, type CALDecision, type CALEvent,
  type CALAssistance, type CALPlan,
} from "./cal-machine";
import {
  MICROCOMPETENCIES, getMicrocompetency, getMicrotask, evaluateClosedMicrotask,
  type MicroTask, type MicroCompetency, type ClosedTaskCheck,
} from "./microcompetency-catalog";

export type AdapterTask = Readonly<{
  deliveryId: string;
  taskId: string; taskVersion: number;
  competencyId: string; objectiveId: string; contextId: string;
  phase: CALState; promptText: string;
  supportShown: CALAssistance;
  rubric: "closed_rule_candidate" | "requires_review";
  delivered: boolean;
}>;
export type CatalogCALSession = Readonly<{
  sessionId: string; ownerUserId: number; revision: number;
  cal: CALSnapshot; selectedCompetencyId: string | null;
  task: AdapterTask | null;
}>;
export type CatalogAdapterResult = Readonly<{
  outcome: "accepted" | "bypassed" | "rejected" | "requires_review";
  reason: string; session: CatalogCALSession;
  candidate?: ClosedTaskCheck;
  missingPrerequisites?: readonly string[];
}>;
const reject=(session:CatalogCALSession,reason:string):CatalogAdapterResult =>
  ({outcome:"rejected",reason,session});
const bypass=(session:CatalogCALSession,reason:string):CatalogAdapterResult =>
  ({outcome:"bypassed",reason,session});
function accepted(session:CatalogCALSession,reason:string):CatalogAdapterResult {
  return {outcome:"accepted",reason,session};
}

export function newCatalogCALSession(ownerUserId:number,sessionId:string):CatalogCALSession {
  if(!Number.isSafeInteger(ownerUserId)||ownerUserId<=0) throw Error("authenticated_user_id_required");
  return {
    sessionId,ownerUserId,revision:0,cal:newCALSession(sessionId),
    selectedCompetencyId:null,task:null,
  };
}
function trusted(session:CatalogCALSession,authenticatedUserId:number):boolean {
  return session.ownerUserId===authenticatedUserId &&
    Number.isSafeInteger(authenticatedUserId) && authenticatedUserId>0;
}
type LocalEvent<E> = E extends unknown ? Omit<E,"sessionId"|"eventId"|"expectedVersion"> : never;
function advance(cal:CALSnapshot,payload:LocalEvent<CALEvent>,identity:string):CALDecision {
  return stepCAL(cal,{
    ...payload,sessionId:cal.sessionId,eventId:identity,
    expectedVersion:cal.version,
  } as CALEvent);
}
function commit(session:CatalogCALSession,cal:CALSnapshot,task:AdapterTask|null):CatalogCALSession {
  return {...session,cal,task,revision:session.revision+1};
}

/** Menu, not a claim that any prerequisite is already learned. */
export function listCatalogOptions(category?:MicroCompetency["domain"]):readonly Readonly<{
  competencyId:string;titlePt:string;prerequisites:readonly string[];
}>[] {
  return MICROCOMPETENCIES.filter(c=>!category || c.domain===category).map(c=>({
    competencyId:c.id,titlePt:c.titlePt,prerequisites:c.prerequisites,
  }));
}

/** Only the trusted host may supply user ID and verified prerequisite IDs. */
export function chooseCatalogObjective(
  session:CatalogCALSession,authenticatedUserId:number,
  competencyId:string,verifiedPrerequisiteIds:ReadonlySet<string>=new Set(),
):CatalogAdapterResult {
  if(!trusted(session,authenticatedUserId))return reject(session,"wrong_account");
  if(session.cal.status!=="active")return reject(session,"session_not_active");
  const competency=getMicrocompetency(competencyId);
  if(!competency)return reject(session,"unknown_competency");
  if(session.selectedCompetencyId===competencyId)return bypass(session,"already_selected");
  let cal=session.cal;
  let nextRevision=session.revision;
  if(cal.objectiveId!==null){
    const reset=advance(cal,{kind:"RESET_OBJECTIVE"},session.sessionId+":reset:"+nextRevision);
    if(reset.result!=="accepted")return reject(session,"reset_"+reset.reason);
    cal=reset.snapshot;nextRevision++;
  }
  const chosen=advance(cal,{kind:"OBJECTIVE_DEFINED",objectiveId:competency.id,route:"teach"},
    session.sessionId+":choose:"+nextRevision);
  if(chosen.result!=="accepted")return reject(session,"selection_"+chosen.reason);
  const missing=competency.prerequisites.filter(id=>!verifiedPrerequisiteIds.has(id));
  return {
    outcome:"accepted",
    reason:missing.length?"objective_chosen_with_unverified_bridges":"objective_chosen",
    missingPrerequisites:missing,
    session:{...session,cal:chosen.snapshot,selectedCompetencyId:competency.id,
      task:null,revision:nextRevision+1},
  };
}
function phaseTask(competency:MicroCompetency,phase:CALState):MicroTask|null {
  const mode=phase==="ENSINAR" ? "closed_meaning"
    : phase==="PRATICAR"||phase==="RETOMAR" ? "closed_expression"
    : phase==="TRANSFERIR" ? "open_transfer" : null;
  return mode
    ? competency.taskIds.map(id=>getMicrotask(id)).find(t=>t?.mode===mode)??null
    : null;
}
function promptFor(competency:MicroCompetency,task:MicroTask,phase:CALState):string {
  if(phase==="ENSINAR")return [
    competency.explanationPt,"Exemplo: "+competency.modelEnglish,
    "Tradução: "+competency.modelPortuguese,task.promptPt,
  ].join("\n");
  return task.promptPt;
}

/** Produces a plan. A plan is not evidence of rendered delivery. */
export function issueCatalogTask(
  session:CatalogCALSession,authenticatedUserId:number,
  needsPortugueseSupport:boolean,
):CatalogAdapterResult & {plan?:CALPlan} {
  if(!trusted(session,authenticatedUserId))return reject(session,"wrong_account");
  if(session.cal.status!=="active")return reject(session,"session_not_active");
  if(session.task)return reject(session,"task_already_pending");
  const competency=session.selectedCompetencyId
    ? getMicrocompetency(session.selectedCompetencyId):null;
  if(!competency)return reject(session,"objective_not_selected");
  const task=phaseTask(competency,session.cal.phase);
  if(!task)return reject(session,"no_task_in_phase");
  const plan=chooseCALPlan(session.cal,{
    needsPortugueseSupport,audioConsent:false,audioAvailable:false,
  });
  const issued:AdapterTask={
    deliveryId:session.sessionId+":"+(session.revision+1)+":"+task.id,
    taskId:task.id,taskVersion:task.version,competencyId:competency.id,
    objectiveId:competency.id,contextId:task.contextId,
    phase:session.cal.phase,promptText:promptFor(competency,task,session.cal.phase),
    supportShown:session.cal.phase==="RETOMAR"?"none":task.assistance,
    rubric:task.mode==="open_transfer"?"requires_review":"closed_rule_candidate",
    delivered:false,
  };
  return {
    outcome:"accepted",reason:"task_plan_only_not_delivered",
    session:{...session,task:issued,revision:session.revision+1},plan,
  };
}

/** Lab-only trusted host callback. Must NEVER be exposed to browser/LLM. */
export function attestCatalogTaskDelivery(
  session:CatalogCALSession,authenticatedUserId:number,
  deliveryId:string,renderedText:string,atMs:number,
):CatalogAdapterResult {
  if(!trusted(session,authenticatedUserId))return reject(session,"wrong_account");
  const ticket=session.task;
  if(!ticket||ticket.deliveryId!==deliveryId)return reject(session,"stale_or_wrong_delivery");
  if(ticket.delivered)return reject(session,"delivery_already_attested");
  if(ticket.promptText!==renderedText)return reject(session,"rendered_prompt_mismatch");
  if(!Number.isFinite(atMs)||atMs<0)return reject(session,"invalid_delivery_time");
  if(ticket.phase!==session.cal.phase)return reject(session,"stale_cal_phase");
  let cal=session.cal;
  if(cal.phase==="ENSINAR"){
    const shown=advance(cal,{kind:"MODEL_PRESENTED",atMs},deliveryId+":model");
    if(shown.result!=="accepted")return reject(session,"model_"+shown.reason);
    cal=shown.snapshot;
  }
  return accepted(commit(session,cal,{...ticket,delivered:true}),"template_delivery_attested_by_host");
}

/** The trusted host has already classified the student's intent. */
export function respondToCatalogTask(
  session:CatalogCALSession,authenticatedUserId:number,
  response:Readonly<
    | {kind:"explicit_answer";text:string;modality:"typed"|"asr_text";attemptedAtMs:number}
    | {kind:"question"|"help"|"change_objective"|"pause"|"unclear";
       text?:string;attemptedAtMs:number}
  >,
):CatalogAdapterResult {
  if(!trusted(session,authenticatedUserId))return reject(session,"wrong_account");
  if(session.cal.status!=="active")return reject(session,"session_not_active");
  if(response.kind==="question"||response.kind==="change_objective"||response.kind==="unclear")
    return bypass(session,"learner_intent_overrides_task");
  if(response.kind==="pause"){
    const paused=advance(session.cal,{kind:"PAUSE"},session.sessionId+":pause:"+session.revision);
    return paused.result==="accepted" ?
      accepted(commit(session,paused.snapshot,null),"learner_paused"):reject(session,paused.reason);
  }
  if(response.kind==="help"){
    const help=advance(session.cal,{kind:"NEEDS_HELP"},session.sessionId+":help:"+session.revision);
    return help.result==="accepted" ?
      accepted(commit(session,help.snapshot,null),"reteach_requested_not_error"):reject(session,help.reason);
  }
  const ticket=session.task;
  if(!ticket||!ticket.delivered)return reject(session,"no_attested_task");
  if(ticket.phase!==session.cal.phase)return reject(session,"stale_phase");
  if(!Number.isFinite(response.attemptedAtMs)||response.attemptedAtMs<0)
    return reject(session,"invalid_attempt_time");
  const task=getMicrotask(ticket.taskId);
  if(!task||task.version!==ticket.taskVersion||task.competencyId!==ticket.competencyId)
    return reject(session,"task_version_or_owner_mismatch");
  if(task.mode==="open_transfer"){
    return {
      outcome:"requires_review",reason:"open_transfer_needs_review",
      session:commit(session,session.cal,null),
      candidate:{outcome:"not_evaluable",assessor:"rule_candidate",reason:"open_transfer"},
    };
  }
  // Guard at the adapter boundary too: even a faulty future caller omitting
  // modality must never manufacture a typed-answer learning observation.
  const candidate=evaluateClosedMicrotask(task,response.text,response.modality??"asr_text");
  if(candidate.outcome==="not_evaluable")
    return {outcome:"bypassed",reason:candidate.reason,session,candidate};
  let nextEvent:LocalEvent<CALEvent>;
  if(ticket.phase==="ENSINAR"){
    nextEvent={
      kind:"COMPREHENSION",
      signal:candidate.outcome==="meets"?"demonstrated":"unclear",assessor:"rule",
    };
  } else if(ticket.phase==="PRATICAR"||ticket.phase==="RETOMAR"){
    nextEvent={
      kind:"ATTEMPT",attemptId:ticket.deliveryId+":attempt",
      taskId:ticket.taskId,contextId:ticket.contextId,
      outcome:candidate.outcome,assessor:"rule",
      assistance:ticket.supportShown,atMs:response.attemptedAtMs,
    };
  } else return reject(session,"unsupported_cal_phase");
  const observed=advance(session.cal,nextEvent,ticket.deliveryId+":answer");
  if(observed.result!=="accepted")return reject(session,"cal_"+observed.reason);
  return {
    outcome:"accepted",
    reason:candidate.outcome==="meets"?"closed_candidate_meets":"closed_candidate_not_yet",
    session:commit(session,observed.snapshot,null),candidate,
  };
}
export function resumeCatalogSession(
  session:CatalogCALSession,authenticatedUserId:number,
):CatalogAdapterResult {
  if(!trusted(session,authenticatedUserId))return reject(session,"wrong_account");
  if(session.cal.status!=="paused")return reject(session,"not_paused");
  const r=advance(session.cal,{kind:"RESUME"},session.sessionId+":resume:"+session.revision);
  return r.result==="accepted"?accepted(commit(session,r.snapshot,null),"resumed"):reject(session,r.reason);
}
export function summarizeCatalogSession(session:CatalogCALSession){
  return summarizeCAL(session.cal);
}
