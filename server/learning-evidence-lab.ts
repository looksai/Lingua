/**
 * Lingua Fase 01: future learning-observation persistence contract (LAB ONLY).
 *
 * NO database, routes, CSLE, SRS, certification or migrations. Every candidate
 * is provisional. The trusted host must source all context fields from server
 * authentication, stored consent, immutable delivery records and server clocks.
 * Client claims (including "typed") are not a cryptographic origin guarantee.
 */
import {getMicrocompetency,getMicrotask} from "../shared/pedagogy/microcompetency-catalog";
import type {CALAssistance,CALAssessor,CALOutcome} from "../shared/pedagogy/cal-machine";

export const EVIDENCE_CONTRACT_VERSION=1 as const;
export const EVIDENCE_PURPOSE="pedagogical_observation_storage_v1" as const;
export type EvidenceStage="PRATICAR"|"RETOMAR"|"TRANSFERIR";
export type EvidenceInputOrigin="client_text_claim"|"asr_transcription"|"unknown";
export type EvidenceReviewDisposition="rejected"|"review_required"|"provisional_only";
export type EvidenceGateReason=
  | "invalid_server_context" | "consent_missing" | "consent_identity_mismatch"
  | "consent_invalid" | "consent_expired" | "consent_revoked"
  | "pre_consent_observation" | "wrong_learner" | "invalid_observation"
  | "catalogue_version_mismatch" | "task_not_server_issued"
  | "receipt_not_server_validated" | "observation_before_render"
  | "untrusted_origin" | "untrusted_assessor" | "open_task_requires_review"
  | "provisional_closed_rule_only";

/**
 * This snapshot must be reloaded from authoritative storage within the same
 * transaction as any future write. A client-supplied object is never consent.
 */
export type EvidenceConsentSnapshot=Readonly<{
  consentId:string;userId:number;purpose:typeof EVIDENCE_PURPOSE;policyVersion:1;
  grantedAtMs:number;expiresAtMs:number;
  revokedAtMs:number|null;
}>;
/** Metadata sourced from authenticated Lingua server state, never from an LLM. */
export type TrustedEvidenceContext=Readonly<{
  authenticatedUserId:number;
  nowMs:number;
  currentConsent:EvidenceConsentSnapshot|null;
  receipt:Readonly<{
    userId:number;
    sessionId:string;deliveryId:string;taskId:string;taskVersion:number;
    renderedAtMs:number;
    issuedByServer:boolean;
    renderAckRecorded:boolean;
  }>|null;
  authenticatedAttempt:boolean;
}>;
/**
 * Raw chat messages, ASR transcript and audio are intentionally absent.
 * Type is deliberately narrow; projection below also strips extra runtime keys.
 */
export type LearningObservationCandidate=Readonly<{
  userId:number;
  attemptId:string;sessionId:string;deliveryId:string;
  competencyId:string;competencyVersion:number;
  taskId:string;taskVersion:number;contextId:string;
  stage:EvidenceStage;
  observedAtMs:number;
  outcome:CALOutcome;
  assessor:CALAssessor;assistance:CALAssistance;
  origin:EvidenceInputOrigin;
}>;
/** A minimal projection for a hypothetical consent-scoped PROVISIONAL table. */
export type ProvisionalEvidenceProjection=Readonly<{
  contractVersion:1;consentId:string;userId:number;
  idempotencyKey:string;
  attemptId:string;sessionId:string;deliveryId:string;
  competencyId:string;competencyVersion:number;
  taskId:string;taskVersion:number;contextId:string;
  stage:EvidenceStage;outcome:CALOutcome;
  assistance:CALAssistance;assessor:"rule";
  origin:"client_text_claim";
  observedAtMs:number;
  status:"provisional_unverified";
  officialLearningEvidence:false;
  mastery:false;
  certification:"not_assessed";
}>;
export type EvidenceGateResult=Readonly<{
  disposition:EvidenceReviewDisposition;
  reason:EvidenceGateReason;
  projection:ProvisionalEvidenceProjection|null;
  officialLearningEvidence:false;
  mastery:false;
  certification:"not_assessed";
}>;
const decision=(disposition:EvidenceReviewDisposition,reason:EvidenceGateReason,
  projection:ProvisionalEvidenceProjection|null=null):EvidenceGateResult=>
  ({disposition,reason,projection,officialLearningEvidence:false,mastery:false,
    certification:"not_assessed"});

const validId=(v:unknown):v is string=>
  typeof v==="string"&&v.length>0&&v.length<=180&&/^[A-Za-z0-9.:_-]+$/u.test(v);
const safeUserId=(v:number)=>Number.isSafeInteger(v)&&v>0;
const nonnegativeTime=(v:number)=>Number.isSafeInteger(v)&&v>=0;
const validOutcome=(v:unknown):v is CALOutcome=>
  v==="meets"||v==="partial"||v==="not_yet"||v==="not_evaluable";
const validAssistance=(v:unknown):v is CALAssistance=>
  v==="none"||v==="hint"||v==="translation"||v==="model";
const validStage=(v:unknown):v is EvidenceStage=>
  v==="PRATICAR"||v==="RETOMAR"||v==="TRANSFERIR";

/**
 * A gate for potentially storing a *provisional* closed-rule observation, not
 * an application authorization. Caller must authenticate server context and
 * recheck live consent in the write transaction. No function here writes data.
 */
export function gateLearningObservation(
  candidate:LearningObservationCandidate,ctx:TrustedEvidenceContext,
):EvidenceGateResult {
  if(!safeUserId(ctx.authenticatedUserId)||!nonnegativeTime(ctx.nowMs))
    return decision("rejected","invalid_server_context");
  const consent=ctx.currentConsent;
  if(!consent)return decision("rejected","consent_missing");
  if(consent.userId!==ctx.authenticatedUserId)
    return decision("rejected","consent_identity_mismatch");
  if(!validId(consent.consentId)||consent.purpose!==EVIDENCE_PURPOSE||
    consent.policyVersion!==EVIDENCE_CONTRACT_VERSION||
    !nonnegativeTime(consent.grantedAtMs)||!nonnegativeTime(consent.expiresAtMs)||
    consent.expiresAtMs<=consent.grantedAtMs||consent.grantedAtMs>ctx.nowMs)
    return decision("rejected","consent_invalid");
  if(consent.revokedAtMs!==null)
    return decision("rejected","consent_revoked");
  if(ctx.nowMs>=consent.expiresAtMs)
    return decision("rejected","consent_expired");
  if(candidate.userId!==ctx.authenticatedUserId)
    return decision("rejected","wrong_learner");
  if(!validId(candidate.attemptId)||!validId(candidate.sessionId)||
    !validId(candidate.deliveryId)||!validId(candidate.taskId)||
    !validId(candidate.competencyId)||!validId(candidate.contextId)||
    !Number.isSafeInteger(candidate.taskVersion)||
    !Number.isSafeInteger(candidate.competencyVersion)||
    !nonnegativeTime(candidate.observedAtMs)||candidate.observedAtMs>ctx.nowMs||
    !validStage(candidate.stage)||!validOutcome(candidate.outcome)||
    !validAssistance(candidate.assistance))
    return decision("rejected","invalid_observation");
  if(candidate.observedAtMs<consent.grantedAtMs)
    return decision("rejected","pre_consent_observation");
  const task=getMicrotask(candidate.taskId);
  const competency=getMicrocompetency(candidate.competencyId);
  if(!task||!competency||task.competencyId!==candidate.competencyId||
    task.version!==candidate.taskVersion||
    competency.version!==candidate.competencyVersion)
    return decision("rejected","catalogue_version_mismatch");

  const receipt=ctx.receipt;
  if(!receipt||receipt.userId!==ctx.authenticatedUserId||
    receipt.sessionId!==candidate.sessionId||
    receipt.deliveryId!==candidate.deliveryId||
    receipt.taskId!==candidate.taskId||
    receipt.taskVersion!==candidate.taskVersion||
    !receipt.issuedByServer||!ctx.authenticatedAttempt)
    return decision("rejected","task_not_server_issued");
  if(!receipt.renderAckRecorded||!nonnegativeTime(receipt.renderedAtMs)||
    receipt.renderedAtMs>ctx.nowMs)
    return decision("rejected","receipt_not_server_validated");
  if(candidate.observedAtMs<receipt.renderedAtMs)
    return decision("rejected","observation_before_render");

  // An ASR token could someday attest *transcription provenance*, but never
  // acoustic pronunciation skill. Here ASR and unknown input cannot score.
  if(candidate.origin!=="client_text_claim")
    return decision("rejected","untrusted_origin");
  if(candidate.assessor!=="rule")
    return decision("review_required","untrusted_assessor");
  if(task.mode==="open_transfer"||candidate.stage==="TRANSFERIR")
    return decision("review_required","open_task_requires_review");
  if(task.mode==="closed_meaning"&&candidate.stage!=="PRATICAR"&&
    candidate.stage!=="RETOMAR")
    return decision("rejected","invalid_observation");
  if(task.mode!=="closed_meaning"&&task.mode!=="closed_expression")
    return decision("review_required","open_task_requires_review");
  if(candidate.outcome==="not_evaluable")
    return decision("rejected","untrusted_assessor");

  // This is a metadata-only projection, not mastery. Even a "meets" outcome
  // from one answered prompt is still an unverified provisional observation.
  const projection:ProvisionalEvidenceProjection={
    contractVersion:1,consentId:consent.consentId,userId:ctx.authenticatedUserId,
    idempotencyKey:ctx.authenticatedUserId+":"+candidate.attemptId,
    attemptId:candidate.attemptId,sessionId:candidate.sessionId,
    deliveryId:candidate.deliveryId,
    competencyId:candidate.competencyId,competencyVersion:candidate.competencyVersion,
    taskId:candidate.taskId,taskVersion:candidate.taskVersion,
    contextId:candidate.contextId,stage:candidate.stage,
    outcome:candidate.outcome,assistance:candidate.assistance,
    assessor:"rule",origin:"client_text_claim",
    observedAtMs:candidate.observedAtMs,status:"provisional_unverified",
    officialLearningEvidence:false,mastery:false,certification:"not_assessed",
  };
  return decision("provisional_only","provisional_closed_rule_only",projection);
}
