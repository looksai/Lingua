import {describe,expect,it} from "vitest";
import {newCALSession,stepCAL,type CALEvent,type CALSnapshot} from "./cal-machine";
import {diagnoseCALProof} from "./cal-proof-diagnostics";

function run(){
  let session=newCALSession("fictional-proof-gate");
  let index=0;
  const apply=(event:Omit<CALEvent,"sessionId"|"eventId"|"expectedVersion">)=>{
    const result=stepCAL(session,{...event,sessionId:session.sessionId,
      eventId:"proof-"+(++index),expectedVersion:session.version} as CALEvent);
    expect(result.result,result.reason).toBe("accepted");
    session=result.snapshot;
  };
  return {get state():CALSnapshot{return session;},apply};
}
const prepare=()=>{
  const s=run();
  s.apply({kind:"OBJECTIVE_DEFINED",objectiveId:"greeting.hello",route:"teach"});
  s.apply({kind:"MODEL_PRESENTED",atMs:1000});
  s.apply({kind:"COMPREHENSION",signal:"wants_to_try",assessor:"llm_candidate"});
  return s;
};
const practice=(s:ReturnType<typeof run>,assistance:"none"|"model"="none")=>
  s.apply({kind:"ATTEMPT",attemptId:"practice-1",taskId:"greeting-task",contextId:"home",
    outcome:"meets",assessor:"rule",assistance,atMs:1100});

describe("CAL diagnostic never confuses controller execution with learning proof",()=>{
  it("keeps all real-world gates closed for an untouched objective",()=>{
    const report=diagnoseCALProof(prepare().state);
    expect(report.practiceCandidate).toBe(false);
    expect(report.liveTutorValidated).toBe(false);
    expect(report.outstanding).toContain("no_verified_cross_session_retention");
    expect(report.certification).toBe("not_assessed");
  });
  it("does not credit model-assisted practice as independent evidence",()=>{
    const s=prepare();practice(s,"model");
    const r=diagnoseCALProof(s.state);
    expect(r.practiceCandidate).toBe(false);
    expect(r.controllerSequenceCandidate).toBe(false);
  });
  it("distinguishes an immediate recall from delayed retention",()=>{
    const s=prepare();practice(s);
    s.apply({kind:"START_RECALL",atMs:1200});
    s.apply({kind:"ATTEMPT",attemptId:"recall-1",taskId:"recall-task",
      contextId:"home",outcome:"meets",assessor:"rule",assistance:"none",atMs:1300});
    const r=diagnoseCALProof(s.state);
    expect(r.practiceCandidate).toBe(true);
    expect(r.delayedRecallCandidate).toBe(false);
    expect(r.liveTutorValidated).toBe(false);
  });
  it("requires novel context independently, not repetition of the same example",()=>{
    const s=prepare();practice(s);
    expect(stepCAL(s.state,{kind:"START_TRANSFER",sessionId:s.state.sessionId,
      eventId:"reuse-context",expectedVersion:s.state.version,taskId:"transfer",contextId:"home"}).result).toBe("rejected");
    s.apply({kind:"START_TRANSFER",taskId:"transfer",contextId:"at-work"});
    s.apply({kind:"ATTEMPT",attemptId:"transfer-1",taskId:"transfer",contextId:"at-work",
      outcome:"meets",assessor:"rule",assistance:"model",atMs:2400});
    s.apply({kind:"SUMMARIZE"});
    expect(diagnoseCALProof(s.state).novelContextTransferCandidate).toBe(false);
  });
  it("even a full synthetic path is never a validated tutor outcome",()=>{
    const s=prepare();practice(s);
    s.apply({kind:"START_RECALL",atMs:86_401_000});
    s.apply({kind:"ATTEMPT",attemptId:"recall-2",taskId:"recall-task",
      contextId:"home",outcome:"meets",assessor:"rule",assistance:"none",atMs:86_401_100});
    s.apply({kind:"START_TRANSFER",taskId:"transfer-2",contextId:"at-work"});
    s.apply({kind:"ATTEMPT",attemptId:"transfer-2-attempt",taskId:"transfer-2",
      contextId:"at-work",outcome:"meets",assessor:"rule",assistance:"none",atMs:86_402_000});
    s.apply({kind:"SUMMARIZE"});
    const r=diagnoseCALProof(s.state);
    expect(r.phase).toBe("COMPROVAR");
    expect(r.controllerSequenceCandidate).toBe(true);
    expect(r.practiceCandidate).toBe(true);
    expect(r.delayedRecallCandidate).toBe(true);
    expect(r.novelContextTransferCandidate).toBe(true);
    expect(r.boundedSummaryCandidate).toBe(true);
    expect(r.liveTutorValidated).toBe(false);
    expect(r.certification).toBe("not_assessed");
    expect(r.outstanding).toContain("no_trusted_browser_delivery_receipt");
    expect(r.outstanding).toContain("no_comparator_experiment");
  });
  it("COMPROVAR after an immediate transfer does not invent delayed retention",()=>{
    const s=prepare();practice(s);
    s.apply({kind:"START_TRANSFER",taskId:"transfer",contextId:"at-work"});
    s.apply({kind:"ATTEMPT",attemptId:"transfer-3",taskId:"transfer",contextId:"at-work",
      outcome:"meets",assessor:"rule",assistance:"none",atMs:4000});
    s.apply({kind:"SUMMARIZE"});
    const r=diagnoseCALProof(s.state);
    expect(r.boundedSummaryCandidate).toBe(true);
    expect(r.delayedRecallCandidate).toBe(false);
    expect(r.controllerSequenceCandidate).toBe(false);
    expect(r.certification).toBe("not_assessed");
  });
});
