import {describe,expect,it} from "vitest";
import {
  EVIDENCE_CONTRACT_VERSION,EVIDENCE_PURPOSE,gateLearningObservation,
  type EvidenceConsentSnapshot,type LearningObservationCandidate,
  type TrustedEvidenceContext,
} from "./learning-evidence-lab";

const consent:EvidenceConsentSnapshot={
  consentId:"fictional-consent-001",userId:41,
  purpose:EVIDENCE_PURPOSE,policyVersion:EVIDENCE_CONTRACT_VERSION,
  grantedAtMs:1000,expiresAtMs:10000,revokedAtMs:null,
};
const input:LearningObservationCandidate={
  userId:41,attemptId:"attempt-001",sessionId:"server-session-A",
  deliveryId:"ticket-001",competencyId:"greeting.hello",
  competencyVersion:1,taskId:"hello.expression",taskVersion:1,
  contextId:"hello.word.expression",stage:"PRATICAR",
  observedAtMs:2000,outcome:"meets",assessor:"rule",
  assistance:"model",origin:"client_text_claim",
};
const context:TrustedEvidenceContext={
  authenticatedUserId:41,nowMs:2100,currentConsent:consent,
  receipt:{
    userId:41,sessionId:input.sessionId,deliveryId:input.deliveryId,
    taskId:input.taskId,taskVersion:input.taskVersion,
    contextId:input.contextId,stage:input.stage,supportShown:input.assistance,
    renderedAtMs:1800,issuedByServer:true,renderAckRecorded:true,
  },
  authenticatedAttempt:true,
};
const gate=(obs:LearningObservationCandidate=input,ctx:TrustedEvidenceContext=context)=>
  gateLearningObservation(obs,ctx);
const changed=(overrides:Partial<LearningObservationCandidate>)=>gate({...input,...overrides});
const withContext=(overrides:Partial<TrustedEvidenceContext>)=>gate(input,{...context,...overrides});
const checkNeverOfficial=(result:ReturnType<typeof gate>)=>{
  expect(result.mastery).toBe(false);
  expect(result.officialLearningEvidence).toBe(false);
  expect(result.certification).toBe("not_assessed");
  if(result.projection){
    expect(result.projection.mastery).toBe(false);
    expect(result.projection.officialLearningEvidence).toBe(false);
    expect(result.projection.certification).toBe("not_assessed");
  }
};
const rejected=(reason:string,result:ReturnType<typeof gate>)=>{
  expect(result.disposition).toBe("rejected");
  expect(result.reason).toBe(reason);
  expect(result.projection).toBeNull();
  checkNeverOfficial(result);
};

describe("Lingua provisional learning observation gate — no DB, no official evidence",()=>{
  it("returns only a bounded unverified projection for consented closed-rule metadata",()=>{
    const r=gate();
    expect(r.disposition).toBe("provisional_only");
    expect(r.reason).toBe("provisional_closed_rule_only");
    expect(r.projection).toMatchObject({
      contractVersion:1,userId:41,consentId:consent.consentId,
      idempotencyKey:"41:attempt-001",competencyId:"greeting.hello",
      taskId:"hello.expression",stage:"PRATICAR",outcome:"meets",
      assistance:"model",status:"provisional_unverified",
      officialLearningEvidence:false,mastery:false,certification:"not_assessed",
    });
    checkNeverOfficial(r);
  });
  it("whitelists only metadata; raw answer/audio/profile cannot be projected",()=>{
    const malicious={...input,rawAnswer:"PRIVATE_ANSWER",audioBase64:"PRIVATE_AUDIO",
      email:"private@example.test",name:"PRIVATE_NAME"} as LearningObservationCandidate;
    const r=gate(malicious);
    expect(r.disposition).toBe("provisional_only");
    const result=JSON.stringify(r.projection);
    for(const secret of ["PRIVATE_ANSWER","PRIVATE_AUDIO","private@example.test",
      "PRIVATE_NAME","rawAnswer","audioBase64","email","profile","phonemeScore","cefr"])
      expect(result).not.toContain(secret);
    expect(Object.keys(r.projection??{}).sort()).toEqual([
      "assessor","assistance","attemptId","certification","competencyId",
      "competencyVersion","consentId","contextId","contractVersion","deliveryId",
      "idempotencyKey","mastery","observedAtMs","officialLearningEvidence",
      "origin","outcome","sessionId","stage","status","taskId","taskVersion","userId",
    ].sort());
  });
  it("requires distinct consent; chat/memory consent is not a substitute",()=>{
    rejected("consent_missing",withContext({currentConsent:null}));
    rejected("consent_invalid",withContext({
      currentConsent:{...consent,purpose:"general_chat" as typeof EVIDENCE_PURPOSE},
    }));
    rejected("consent_invalid",withContext({
      currentConsent:{...consent,policyVersion:2 as 1},
    }));
    rejected("consent_identity_mismatch",withContext({
      currentConsent:{...consent,userId:42},
    }));
  });
  it("denies expired, revoked, future or backdated consent",()=>{
    rejected("consent_expired",withContext({nowMs:10000}));
    rejected("consent_expired",withContext({nowMs:10001}));
    rejected("consent_revoked",withContext({
      currentConsent:{...consent,revokedAtMs:1500},
    }));
    rejected("consent_invalid",withContext({
      currentConsent:{...consent,grantedAtMs:2500},
    }));
    rejected("pre_consent_observation",changed({observedAtMs:999}));
  });
  it("rejects invalid authenticated principal and cross-account payload",()=>{
    rejected("invalid_server_context",withContext({authenticatedUserId:0}));
    rejected("invalid_server_context",withContext({authenticatedUserId:1.5}));
    rejected("invalid_server_context",withContext({nowMs:NaN}));
    rejected("wrong_learner",changed({userId:42}));
  });
  it("binds the exact catalog task, context, version and competency",()=>{
    rejected("catalogue_version_mismatch",changed({competencyId:"greeting.goodbye"}));
    rejected("catalogue_version_mismatch",changed({competencyVersion:2}));
    rejected("catalogue_version_mismatch",changed({taskVersion:2}));
    rejected("catalogue_version_mismatch",changed({contextId:"hallway.other"}));
    rejected("catalogue_version_mismatch",changed({taskId:"unlisted.task"}));
  });
  it("requires an immutable authorized server issuance receipt and same delivery",()=>{
    rejected("task_not_server_issued",withContext({receipt:null}));
    rejected("task_not_server_issued",withContext({authenticatedAttempt:false}));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,userId:42},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,sessionId:"other-session"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,deliveryId:"other-ticket"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,taskId:"other.task"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,contextId:"other.context"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,stage:"RETOMAR"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,supportShown:"none"},
    }));
    rejected("task_not_server_issued",withContext({
      receipt:{...context.receipt!,issuedByServer:false},
    }));
  });
  it("rejects unrecorded/late DOM receipt and observations preceding it",()=>{
    rejected("receipt_not_server_validated",withContext({
      receipt:{...context.receipt!,renderAckRecorded:false},
    }));
    rejected("receipt_not_server_validated",withContext({
      receipt:{...context.receipt!,renderedAtMs:2300},
    }));
    rejected("pre_consent_delivery",withContext({
      receipt:{...context.receipt!,renderedAtMs:999},
    }));
    rejected("observation_before_render",changed({observedAtMs:1799}));
  });
  it("rejects ASR and missing-origin payloads even when a task is closed",()=>{
    rejected("untrusted_origin",changed({origin:"asr_transcription"}));
    rejected("untrusted_origin",changed({origin:"unknown"}));
    rejected("untrusted_origin",changed({origin:undefined as unknown as "client_text_claim"}));
  });
  it("does not treat LLM or bare human assessor labels as verified rule outcomes",()=>{
    const llm=changed({assessor:"llm_candidate"});
    expect(llm.disposition).toBe("review_required");
    expect(llm.reason).toBe("untrusted_assessor");
    expect(llm.projection).toBeNull();
    const human=changed({assessor:"human"});
    expect(human.disposition).toBe("review_required");
    expect(human.projection).toBeNull();
    checkNeverOfficial(llm);checkNeverOfficial(human);
  });
  it("open transfer tasks never bypass independent human rubric review",()=>{
    const r=gate({
      ...input,taskId:"hello.transfer",contextId:"hello.station.new",
      stage:"TRANSFERIR",assistance:"none",
    },{
      ...context,receipt:{
        ...context.receipt!,taskId:"hello.transfer",
        contextId:"hello.station.new",stage:"TRANSFERIR",supportShown:"none",
      },
    });
    expect(r.disposition).toBe("review_required");
    expect(r.reason).toBe("open_task_requires_review");
    expect(r.projection).toBeNull();
    checkNeverOfficial(r);
  });
  it("does not project a meaning task as independent phrase production",()=>{
    const r=gate({
      ...input,taskId:"hello.meaning",contextId:"hello.word.meaning",
    },{
      ...context,receipt:{...context.receipt!,
        taskId:"hello.meaning",contextId:"hello.word.meaning"},
    });
    rejected("invalid_observation",r);
  });
  it("does not project a non-evaluable outcome",()=>{
    rejected("untrusted_assessor",changed({outcome:"not_evaluable"}));
  });
  it("rejects malformed runtime data even when TypeScript is bypassed",()=>{
    rejected("invalid_observation",changed({attemptId:""}));
    rejected("invalid_observation",changed({contextId:"PRIVATE MESSAGE"}));
    rejected("invalid_observation",changed({observedAtMs:Infinity}));
    rejected("invalid_observation",changed({observedAtMs:2101}));
    rejected("invalid_observation",changed({taskVersion:1.5}));
    rejected("invalid_observation",changed({outcome:"mastered" as "meets"}));
  });
  it("has no route to promote a success to mastery at any output path",()=>{
    for(const outcome of ["meets","partial","not_yet","not_evaluable"] as const){
      for(const assistance of ["none","hint","translation","model"] as const){
        for(const origin of ["client_text_claim","asr_transcription","unknown"] as const){
          const r=gate({...input,outcome,assistance,origin},{
            ...context,receipt:{...context.receipt!,supportShown:assistance},
          });
          checkNeverOfficial(r);
        }
      }
    }
  });
});
