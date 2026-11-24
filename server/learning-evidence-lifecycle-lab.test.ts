import {describe,expect,it} from "vitest";
import {
  emptyEvidenceLabLedger,stepEvidenceLab,
  LAB_CONSENT_MAX_DURATION_MS,LAB_PROVISIONAL_RETENTION_MS,
  type EvidenceLabLedger,
} from "./learning-evidence-lifecycle-lab";
import {
  EVIDENCE_PURPOSE,type EvidenceConsentSnapshot,
  type LearningObservationCandidate,type TrustedEvidenceContext,
} from "./learning-evidence-lab";

const learner=41;
const started=1_000;
const consent:EvidenceConsentSnapshot={
  consentId:"consent-v1",userId:learner,purpose:EVIDENCE_PURPOSE,
  policyVersion:1,grantedAtMs:started,expiresAtMs:LAB_CONSENT_MAX_DURATION_MS+started,
  revokedAtMs:null,
};
const observation:LearningObservationCandidate={
  userId:learner,attemptId:"attempt-1",sessionId:"session-1",
  deliveryId:"delivery-1",competencyId:"greeting.hello",competencyVersion:1,
  taskId:"hello.expression",taskVersion:1,contextId:"hello.word.expression",
  stage:"PRATICAR",observedAtMs:2_000,outcome:"meets",
  assessor:"rule",assistance:"model",origin:"client_text_claim",
};
const trusted:TrustedEvidenceContext={
  authenticatedUserId:learner,nowMs:2_500,currentConsent:consent,
  receipt:{
    userId:learner,sessionId:"session-1",deliveryId:"delivery-1",
    taskId:"hello.expression",taskVersion:1,contextId:"hello.word.expression",
    stage:"PRATICAR",supportShown:"model",renderedAtMs:1_800,
    issuedByServer:true,renderAckRecorded:true,
  },
  authenticatedAttempt:true,
};
const fresh=()=>emptyEvidenceLabLedger(learner);
const grant=(state:EvidenceLabLedger,overrides:Partial<EvidenceConsentSnapshot>={},nowMs=started)=>
  stepEvidenceLab(state,{kind:"grant",userId:learner,expectedRevision:state.revision,
    nowMs,consent:{...consent,...overrides}});
const propose=(state:EvidenceLabLedger,
  candidate:LearningObservationCandidate=observation,
  context:TrustedEvidenceContext=trusted,
  expectedRevision=state.revision)=>
  stepEvidenceLab(state,{kind:"propose",userId:learner,expectedRevision,
    candidate,context});
const initialized=()=>grant(fresh()).state;
const recorded=()=>propose(initialized()).state;
const revoked=(s:EvidenceLabLedger,at=3_000)=>
  stepEvidenceLab(s,{kind:"revoke",userId:learner,expectedRevision:s.revision,nowMs:at});
const erased=(s:EvidenceLabLedger,at=3_000)=>
  stepEvidenceLab(s,{kind:"erase",userId:learner,expectedRevision:s.revision,nowMs:at});

describe("future observation storage lifecycle: pure reference model, not actual DB",()=>{
  it("starts with zero consent and zero observations",()=>{
    expect(fresh()).toEqual({userId:learner,revision:0,consent:null,observations:[]});
    expect(()=>emptyEvidenceLabLedger(-1)).toThrow("Invalid learner ID");
  });

  it("requires a purpose-specific, server-time-bounded first opt-in",()=>{
    const r=grant(fresh());
    expect(r.outcome).toBe("applied");
    expect(r.state.revision).toBe(1);
    expect(r.state.consent?.purpose).toBe(EVIDENCE_PURPOSE);
    expect(r.state.observations).toEqual([]);
    expect(grant(fresh(),{userId:42}).reason).toBe("invalid_consent");
    expect(grant(fresh(),{purpose:"chat_memory" as typeof EVIDENCE_PURPOSE}).reason).toBe("invalid_consent");
    expect(grant(fresh(),{grantedAtMs:started-1}).reason).toBe("invalid_consent");
    expect(grant(fresh(),{expiresAtMs:started+LAB_CONSENT_MAX_DURATION_MS+1}).reason)
      .toBe("invalid_consent");
    expect(grant(fresh(),{revokedAtMs:started}).reason).toBe("invalid_consent");
    expect(grant(fresh(),{consentId:"bad consent"}).reason).toBe("invalid_consent");
    expect(grant(r.state,{consentId:"next"}).reason).toBe("active_consent_exists");
  });

  it("does not use client-furnished consent to bypass the active ledger",()=>{
    const fake={...trusted,currentConsent:consent};
    const r=propose(fresh(),observation,fake);
    expect(r.outcome).toBe("rejected");
    expect(r.gate?.reason).toBe("consent_missing");
    expect(r.state).toEqual(fresh());
  });

  it("projects only provisional metadata; no mastery, audio or identity fields",()=>{
    const state=initialized();
    const candidate={...observation,rawAnswer:"SECRET ANSWER",
      email:"private@example.test",audioBase64:"SECRET AUDIO"} as LearningObservationCandidate;
    const r=propose(state,candidate);
    expect(r.outcome).toBe("applied");
    expect(r.state.observations).toHaveLength(1);
    expect(r.state.observations[0]).toMatchObject({
      status:"provisional_unverified",mastery:false,
      officialLearningEvidence:false,certification:"not_assessed",
      consentId:consent.consentId,
    });
    const json=JSON.stringify(r.state);
    for(const text of ["SECRET ANSWER","SECRET AUDIO","private@example.test"])
      expect(json).not.toContain(text);
    expect(state.observations).toHaveLength(0);
  });

  it("replays the same attempt idempotently without incrementing revision",()=>{
    const state=recorded();
    const r=propose(state);
    expect(r.outcome).toBe("duplicate");
    expect(r.reason).toBe("duplicate_attempt");
    expect(r.state).toBe(state);
    expect(r.state.revision).toBe(2);
  });

  it("rejects same attempt ID reused for another outcome rather than overwriting",()=>{
    const state=recorded();
    const r=propose(state,{...observation,outcome:"not_yet"});
    expect(r.outcome).toBe("rejected");
    expect(r.reason).toBe("attempt_key_conflict");
    expect(r.state).toBe(state);
    expect(r.state.observations[0].outcome).toBe("meets");
  });

  it("simulates two competing inserts: exactly one revision wins",()=>{
    const state=initialized();
    const revision=state.revision;
    const first=propose(state,observation,trusted,revision);
    expect(first.outcome).toBe("applied");
    const concurrent=propose(first.state,{...observation,outcome:"not_yet"},
      trusted,revision);
    expect(concurrent.reason).toBe("stale_revision");
    expect(concurrent.state.observations).toEqual(first.state.observations);
  });

  it("revocation purges provisional data and rejects a late stale write",()=>{
    const state=recorded();
    const revocation=revoked(state);
    expect(revocation.outcome).toBe("applied");
    expect(revocation.state.observations).toEqual([]);
    expect(revocation.state.consent?.revokedAtMs).toBe(3_000);
    const oldRevision=propose(revocation.state,observation,
      {...trusted,nowMs:3_200},state.revision);
    expect(oldRevision.reason).toBe("stale_revision");
    const liveRevision=propose(revocation.state,observation,
      {...trusted,nowMs:3_200});
    expect(liveRevision.gate?.reason).toBe("consent_revoked");
    expect(liveRevision.state.observations).toEqual([]);
    expect(revoked(revocation.state).reason).toBe("already_revoked");
  });

  it("an in-flight write cannot beat a revoke at the same revision",()=>{
    const state=initialized();
    const revokeFirst=revoked(state);
    const writeAfter=propose(revokeFirst.state,observation,trusted,state.revision);
    expect(writeAfter.reason).toBe("stale_revision");
    expect(writeAfter.state.observations).toEqual([]);
  });

  it("explicit erase clears consent and data and invalidates all pending revisions",()=>{
    const state=recorded();
    const purge=erased(state);
    expect(purge.outcome).toBe("applied");
    expect(purge.state.consent).toBeNull();
    expect(purge.state.observations).toEqual([]);
    expect(purge.state.revision).toBe(state.revision+1);
    expect(propose(purge.state,observation,trusted,state.revision).reason)
      .toBe("stale_revision");
    expect(propose(purge.state).gate?.reason).toBe("consent_missing");
    const secondErase=erased(purge.state);
    expect(secondErase.state.revision).toBe(purge.state.revision+1);
  });

  it("new consent begins an empty epoch; pre-consent attempts cannot return",()=>{
    const afterRevoked=revoked(recorded()).state;
    const newAt=4_000;
    const consentTwo={...consent,consentId:"consent-v2",grantedAtMs:newAt,
      expiresAtMs:newAt+LAB_CONSENT_MAX_DURATION_MS,revokedAtMs:null};
    const renewed=grant(afterRevoked,consentTwo,newAt);
    expect(renewed.outcome).toBe("applied");
    expect(renewed.state.observations).toHaveLength(0);
    expect(renewed.state.consent?.consentId).toBe("consent-v2");
    const staleAttempt=propose(renewed.state,observation,{
      ...trusted,nowMs:4_200,
      currentConsent:consentTwo,
    });
    expect(staleAttempt.gate?.reason).toBe("pre_consent_observation");
    expect(staleAttempt.state.observations).toHaveLength(0);
  });

  it("an ASR transcript cannot enter the provisional ledger even after opting in",()=>{
    const r=propose(initialized(),{...observation,origin:"asr_transcription"});
    expect(r.outcome).toBe("rejected");
    expect(r.gate?.reason).toBe("untrusted_origin");
    expect(r.state.observations).toEqual([]);
  });

  it("retention prunes old metadata but does not prolong consent",()=>{
    const state=recorded();
    const due=observation.observedAtMs+LAB_PROVISIONAL_RETENTION_MS;
    const r=stepEvidenceLab(state,{
      kind:"prune",userId:learner,expectedRevision:state.revision,nowMs:due,
    });
    expect(r.outcome).toBe("applied");
    expect(r.state.observations).toEqual([]);
    expect(r.state.consent?.consentId).toBe("consent-v1");
    expect(r.state.revision).toBe(state.revision+1);
  });

  it("rejects attempts submitted outside the hypothetical retention window",()=>{
    const late=observation.observedAtMs+LAB_PROVISIONAL_RETENTION_MS;
    const r=propose(initialized(),observation,{...trusted,nowMs:late});
    expect(r.outcome).toBe("rejected");
    expect(r.reason).toBe("retention_window_elapsed");
    expect(r.state.observations).toEqual([]);
  });

  it("prunes data on consent expiry without recreating a permission",()=>{
    const state=recorded();
    const r=stepEvidenceLab(state,{
      kind:"prune",userId:learner,expectedRevision:state.revision,
      nowMs:consent.expiresAtMs,
    });
    expect(r.outcome).toBe("applied");
    expect(r.state.observations).toEqual([]);
    expect(r.state.consent?.expiresAtMs).toBe(consent.expiresAtMs);
    expect(propose(r.state,observation,{...trusted,nowMs:consent.expiresAtMs})
      .gate?.reason).toBe("consent_expired");
  });

  it("rejects future/invalid time, wrong users and stale revisions without mutation",()=>{
    const state=initialized();
    for(const nowMs of [-1,NaN,Infinity,1.5]){
      const r=stepEvidenceLab(state,{kind:"revoke",userId:learner,
        expectedRevision:state.revision,nowMs});
      expect(r.outcome).toBe("rejected");
      expect(r.state).toBe(state);
    }
    expect(stepEvidenceLab(state,{kind:"erase",userId:42,
      expectedRevision:state.revision,nowMs:3000}).reason).toBe("wrong_learner");
    expect(stepEvidenceLab(state,{kind:"erase",userId:learner,
      expectedRevision:0,nowMs:3000}).reason).toBe("stale_revision");
  });

  it("never presents any provisional record as official evidence across all transitions",()=>{
    let state=initialized();
    for(const c of [observation,{...observation,origin:"asr_transcription"} as const]){
      state=propose(state,c).state;
    }
    for(const p of state.observations){
      expect(p.officialLearningEvidence).toBe(false);
      expect(p.mastery).toBe(false);
      expect(p.certification).toBe("not_assessed");
    }
    const revokedState=revoked(state).state;
    expect(revokedState.observations).toEqual([]);
    expect(erased(revokedState).state.consent).toBeNull();
  });
});
