/**
 * Laboratory-only lifecycle simulator for future Lingua observation persistence.
 *
 * NO DB, endpoint, migration, side effects or official learning evidence.
 * Revision checks model compare-and-swap; they DO NOT supply real transaction
 * isolation. The future DB adapter must atomically lock consent + attempt keys,
 * re-run gates in the transaction, and implement deletion across storage/backups.
 */
import {
  EVIDENCE_CONTRACT_VERSION,EVIDENCE_PURPOSE,gateLearningObservation,
  type EvidenceConsentSnapshot,type EvidenceGateResult,
  type LearningObservationCandidate,type ProvisionalEvidenceProjection,
  type TrustedEvidenceContext,
} from "./learning-evidence-lab";

/** PROPOSED laboratory limits, NOT approved student-data retention policy. */
export const LAB_PROVISIONAL_RETENTION_MS=7*24*60*60*1000;
export const LAB_CONSENT_MAX_DURATION_MS=30*24*60*60*1000;

export type EvidenceLabLedger=Readonly<{
  userId:number;
  revision:number;
  consent:EvidenceConsentSnapshot|null;
  observations:readonly ProvisionalEvidenceProjection[];
}>;

export type EvidenceLabCommand=
  | Readonly<{kind:"grant";userId:number;expectedRevision:number;
      nowMs:number;consent:EvidenceConsentSnapshot}>
  | Readonly<{kind:"propose";userId:number;expectedRevision:number;
      candidate:LearningObservationCandidate;context:TrustedEvidenceContext}>
  | Readonly<{kind:"revoke";userId:number;expectedRevision:number;nowMs:number}>
  | Readonly<{kind:"prune";userId:number;expectedRevision:number;nowMs:number}>
  | Readonly<{kind:"erase";userId:number;expectedRevision:number;nowMs:number}>;

export type EvidenceLabOutcome="applied"|"duplicate"|"no_change"|"rejected";
export type EvidenceLabReason=
  | "ok"|"wrong_learner"|"stale_revision"|"invalid_clock"
  | "invalid_consent"|"active_consent_exists"|"no_consent"|"already_revoked"
  | "retention_window_elapsed"|"attempt_key_conflict"|"duplicate_attempt"
  | "invalid_observation";
export type EvidenceLabResult=Readonly<{
  state:EvidenceLabLedger;
  outcome:EvidenceLabOutcome;
  reason:EvidenceLabReason;
  gate:EvidenceGateResult|null;
}>;
const safeTime=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const validUser=(n:number)=>Number.isSafeInteger(n)&&n>0;
const result=(state:EvidenceLabLedger,outcome:EvidenceLabOutcome,
  reason:EvidenceLabReason,gate:EvidenceGateResult|null=null):EvidenceLabResult=>
  ({state,outcome,reason,gate});
const versioned=(state:EvidenceLabLedger,
  update:Pick<EvidenceLabLedger,"consent"|"observations">):EvidenceLabLedger=>({
  userId:state.userId,revision:state.revision+1,
  consent:update.consent,observations:update.observations,
});

export function emptyEvidenceLabLedger(userId:number):EvidenceLabLedger {
  if(!validUser(userId))throw new Error("Invalid learner ID");
  return {userId,revision:0,consent:null,observations:[]};
}

function validGrant(c:EvidenceConsentSnapshot,userId:number,now:number):boolean {
  if(c.userId!==userId||c.policyVersion!==EVIDENCE_CONTRACT_VERSION||
    c.purpose!==EVIDENCE_PURPOSE||c.revokedAtMs!==null||
    !/^[A-Za-z0-9.:_-]{1,180}$/u.test(c.consentId)||
    !safeTime(c.grantedAtMs)||!safeTime(c.expiresAtMs)||
    c.grantedAtMs!==now||c.expiresAtMs<=now)return false;
  return c.expiresAtMs-now<=LAB_CONSENT_MAX_DURATION_MS;
}

/**
 * Deterministic transitions used for unit tests and architecture review.
 * Observations are projected through the existing gate only, never raw input.
 *
 * All context arguments are assumed to originate from an authenticated server.
 * No command here asserts user identity; a real write adapter MUST do so.
 */
export function stepEvidenceLab(
  state:EvidenceLabLedger,cmd:EvidenceLabCommand,
):EvidenceLabResult {
  if(!validUser(state.userId)||cmd.userId!==state.userId)
    return result(state,"rejected","wrong_learner");
  if(!Number.isSafeInteger(state.revision)||state.revision<0||
    !Number.isSafeInteger(cmd.expectedRevision)||cmd.expectedRevision!==state.revision)
    return result(state,"rejected","stale_revision");
  const now=cmd.kind==="propose"?cmd.context.nowMs:cmd.nowMs;
  if(!safeTime(now))return result(state,"rejected","invalid_clock");

  if(cmd.kind==="grant"){
    if(!validGrant(cmd.consent,state.userId,now))
      return result(state,"rejected","invalid_consent");
    if(state.consent?.revokedAtMs===null && now<state.consent.expiresAtMs)
      return result(state,"rejected","active_consent_exists");
    if(state.consent?.consentId===cmd.consent.consentId)
      return result(state,"rejected","invalid_consent");
    // Re-consenting starts a fresh epoch with zero carried observations.
    return result(versioned(state,{consent:{...cmd.consent},observations:[]}),
      "applied","ok");
  }

  if(cmd.kind==="revoke"){
    if(!state.consent)return result(state,"rejected","no_consent");
    if(state.consent.revokedAtMs!==null)
      return result(state,"no_change","already_revoked");
    if(now<state.consent.grantedAtMs)
      return result(state,"rejected","invalid_clock");
    // Purge candidate metadata immediately in this MODEL; downstream replica /
    // backup purge is deliberately not simulated or claimed here.
    return result(versioned(state,{
      consent:{...state.consent,revokedAtMs:now},observations:[],
    }),"applied","ok");
  }

  if(cmd.kind==="erase"){
    // Increment even when already empty, invalidating a stale in-flight write.
    return result(versioned(state,{consent:null,observations:[]}),"applied","ok");
  }

  if(cmd.kind==="prune"){
    const active=Boolean(state.consent&&state.consent.revokedAtMs===null&&
      now>=state.consent.grantedAtMs&&now<state.consent.expiresAtMs);
    const keep=active?state.observations.filter(o=>
      safeTime(o.observedAtMs)&&o.observedAtMs<=now&&
      now-o.observedAtMs<LAB_PROVISIONAL_RETENTION_MS&&
      o.consentId===state.consent?.consentId&&o.userId===state.userId):[];
    if(keep.length===state.observations.length)
      return result(state,"no_change","ok");
    return result(versioned(state,{consent:state.consent,observations:keep}),
      "applied","ok");
  }

  // PROPOSE: always use the consent from this ledger, not a caller-supplied
  // context.currentConsent that may be stale or belong to another account.
  if(cmd.context.authenticatedUserId!==state.userId)
    return result(state,"rejected","wrong_learner");
  const gate=gateLearningObservation(cmd.candidate,{
    ...cmd.context,currentConsent:state.consent,
  });
  if(gate.disposition!=="provisional_only"||!gate.projection)
    return result(state,"rejected","invalid_observation",gate);
  const proposed=gate.projection;
  if(now-proposed.observedAtMs>=LAB_PROVISIONAL_RETENTION_MS)
    return result(state,"rejected","retention_window_elapsed",gate);
  const existing=state.observations.find(o=>o.idempotencyKey===proposed.idempotencyKey);
  if(existing){
    // A replay is duplicate only when the entire whitelist projection matches;
    // the same attempt key with a different task/outcome is an integrity error.
    if(JSON.stringify(existing)===JSON.stringify(proposed))
      return result(state,"duplicate","duplicate_attempt",gate);
    return result(state,"rejected","attempt_key_conflict",gate);
  }
  return result(versioned(state,{
    consent:state.consent,observations:[...state.observations,proposed],
  }),"applied","ok",gate);
}
