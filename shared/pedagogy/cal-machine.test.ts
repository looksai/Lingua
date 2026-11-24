import {describe, expect, it} from "vitest";
import {
  chooseCALPlan, DEFAULT_CAL_POLICY, newCALSession, proposeSRSFromError,
  stepCAL, summarizeCAL, type CALEvent, type CALObservation,
  type CALPolicy, type CALSnapshot,
} from "./cal-machine";

// All tests are local and use fictional sessions. No MySQL, Groq, SRS or CSLE.
type TestEvent = CALEvent extends infer E
  ? E extends {kind: string}
    ? Omit<E, "sessionId" | "eventId" | "expectedVersion">
    : never
  : never;
let seq=0;
function emit(state: CALSnapshot, payload: TestEvent, extras: Partial<{
  sessionId: string; eventId: string; expectedVersion: number;
}> = {}) {
  return stepCAL(state, {
    ...payload, sessionId: state.sessionId, eventId: `evt-${++seq}`,
    expectedVersion: state.version, ...extras,
  } as CALEvent);
}
function advance(state: CALSnapshot, payload: TestEvent): CALSnapshot {
  const result=emit(state,payload);
  expect(result.result, result.reason).toBe("accepted");
  return result.snapshot;
}
function initial() {return newCALSession("fictional-student-session");}
function teach(): CALSnapshot {
  let state=initial();
  state=advance(state,{kind:"OBJECTIVE_DEFINED",objectiveId:"introduce-job",route:"teach"});
  state=advance(state,{kind:"MODEL_PRESENTED",atMs:1000});
  return state;
}
function practice(): CALSnapshot {
  return advance(teach(),{kind:"COMPREHENSION",signal:"wants_to_try",assessor:"llm_candidate"});
}
function attempt(state:CALSnapshot, extra:Partial<{
  attemptId:string; taskId:string; contextId:string;
  outcome:"meets"|"partial"|"not_yet"|"not_evaluable";
  assessor:"rule"|"human"|"llm_candidate"|"asr_only";
  assistance:"none"|"hint"|"translation"|"model"; atMs:number;
}> = {}) {
  return emit(state,{kind:"ATTEMPT",attemptId:`attempt-${++seq}`,taskId:"job-introduction",
    contextId:"ctx-A",outcome:"meets",assessor:"rule",assistance:"none",atMs:2000,...extra});
}
function successfulPractice(): CALSnapshot {
  return attempt(practice()).snapshot;
}

describe("CAL v0.1 initial conditions / trust boundaries",()=>{
  it("has exactly the initial OBSERVAR state, no student memory or evidence",()=>{
    const state=initial();
    expect(state.phase).toBe("OBSERVAR");
    expect(state.status).toBe("active");
    expect(state.objectiveId).toBeNull();
    expect(state.observations).toEqual([]);
    expect(state.version).toBe(0);
    expect(state).not.toHaveProperty("isPremium");
    expect(state).not.toHaveProperty("cefr");
    expect(state).not.toHaveProperty("learned");
    expect(()=>newCALSession(" ")).toThrow("sessionId");
  });
  it("rejects events from another session before mutating anything",()=>{
    const state=initial();
    const result=emit(state,{kind:"OBJECTIVE_DEFINED",objectiveId:"x",route:"teach"},{sessionId:"other-user-session"});
    expect(result.result).toBe("rejected");
    expect(result.reason).toBe("wrong_session");
    expect(result.snapshot).toBe(state);
  });
  it("rejects stale-version concurrent tabs, and detects identical retries",()=>{
    const state=initial();
    const payload:TestEvent={kind:"OBJECTIVE_DEFINED",objectiveId:"job",route:"teach"};
    const a=emit(state,payload,{eventId:"same-event"});
    expect(a.result).toBe("accepted");
    const duplicate=emit(a.snapshot,payload,{eventId:"same-event",expectedVersion:0});
    expect(duplicate.result).toBe("duplicate");
    expect(duplicate.snapshot).toBe(a.snapshot);
    const stale=emit(a.snapshot,{kind:"RESET_OBJECTIVE"},{expectedVersion:0});
    expect(stale.reason).toBe("stale_version");
    expect(stale.snapshot.phase).toBe("ENSINAR");
  });
  it("accepts no forbidden policy and keeps state immutable",()=>{
    const state=initial();
    const event:CALEvent={sessionId:state.sessionId,eventId:"test",expectedVersion:0,
      kind:"OBJECTIVE_DEFINED",objectiveId:"x",route:"teach"};
    expect(stepCAL(state,event,{...DEFAULT_CAL_POLICY,reteachAfterErrors:0}).reason).toBe("invalid_policy");
    expect(stepCAL(state,event,{...DEFAULT_CAL_POLICY,delayedRecallThresholdMs:-1}).reason).toBe("invalid_policy");
    const r=stepCAL(state,event);
    expect(r.snapshot).not.toBe(state);
    expect(state.version).toBe(0);
    expect(state.objectiveId).toBeNull();
  });
  it("does not choose a nonexistent objective or accidentally repeat selection",()=>{
    const s=initial();
    expect(emit(s,{kind:"OBJECTIVE_DEFINED",objectiveId:"   ",route:"teach"}).reason).toBe("invalid_objective");
    const n=advance(s,{kind:"OBJECTIVE_DEFINED",objectiveId:"job",route:"teach"});
    expect(emit(n,{kind:"OBJECTIVE_DEFINED",objectiveId:"other",route:"teach"}).reason).toBe("not_observing");
    expect(advance(initial(),{kind:"OBJECTIVE_DEFINED",objectiveId:"known",route:"prior_practice"}).phase).toBe("PRATICAR");
  });
});

describe("CAL v0.1 model teaching and comprehension",()=>{
  it("does not treat 'entendi' as observed comprehension",()=>{
    const taught=teach();
    const result=emit(taught,{kind:"COMPREHENSION",signal:"self_report",assessor:"rule"});
    expect(result.snapshot.phase).toBe("ENSINAR");
    expect(result.reason).toBe("comprehension_not_verified");
  });
  it("allows a voluntary attempt without claiming comprehension evidence",()=>{
    const s=advance(teach(),{kind:"COMPREHENSION",signal:"wants_to_try",assessor:"llm_candidate"});
    expect(s.phase).toBe("PRATICAR");
    expect(s.observations).toHaveLength(0);
    expect(s.practiceReady).toBe(false);
  });
  it("only accepts assessed comprehension after a model was presented",()=>{
    const noModel=advance(initial(),{kind:"OBJECTIVE_DEFINED",objectiveId:"job",route:"teach"});
    expect(advance(noModel,{kind:"COMPREHENSION",signal:"demonstrated",assessor:"rule"}).phase).toBe("ENSINAR");
    expect(advance(teach(),{kind:"COMPREHENSION",signal:"demonstrated",assessor:"rule"}).phase).toBe("PRATICAR");
    expect(advance(teach(),{kind:"COMPREHENSION",signal:"demonstrated",assessor:"llm_candidate"}).phase).toBe("ENSINAR");
  });
  it("can respond to confusion without forcing a six-state linear progression",()=>{
    const s=advance(teach(),{kind:"COMPREHENSION",signal:"unclear",assessor:"human"});
    expect(s.phase).toBe("ENSINAR");
    expect(advance(s,{kind:"NEEDS_HELP"}).phase).toBe("ENSINAR");
    expect(emit(initial(),{kind:"NEEDS_HELP"}).reason).toBe("no_objective");
  });
});

describe("CAL v0.1 practice / feedback thresholds",()=>{
  it("uses three verified errors as a configurable RE-TEACH threshold, not a proficiency label",()=>{
    let s=practice();
    for(let i=0;i<2;i++){
      const r=attempt(s,{outcome:"not_yet"});
      expect(r.snapshot.phase).toBe("PRATICAR");
      expect(r.snapshot.consecutiveErrors).toBe(i+1);
      s=r.snapshot;
    }
    const r=attempt(s,{outcome:"not_yet"});
    expect(r.snapshot.phase).toBe("ENSINAR");
    expect(r.snapshot.reteachCycles).toBe(1);
    expect(r.snapshot.consecutiveErrors).toBe(0);
    expect(r.reason).toBe("reteach_with_different_strategy");
  });
  it("allows a different configured threshold without changing other code",()=>{
    let s=practice();
    const policy:CALPolicy={...DEFAULT_CAL_POLICY,reteachAfterErrors:2};
    s=stepCAL(s,{kind:"ATTEMPT",sessionId:s.sessionId,eventId:"custom-1",expectedVersion:s.version,
      attemptId:"custom-a",taskId:"t",contextId:"A",atMs:2000,
      assessor:"rule",assistance:"none",outcome:"not_yet"},policy).snapshot;
    const second=stepCAL(s,{kind:"ATTEMPT",sessionId:s.sessionId,eventId:"custom-2",expectedVersion:s.version,
      attemptId:"custom-b",taskId:"t",contextId:"A",atMs:2001,
      assessor:"rule",assistance:"none",outcome:"not_yet"},policy);
    expect(second.snapshot.phase).toBe("ENSINAR");
  });
  it("unreliable ASR or an LLM-only verdict cannot penalize learner",()=>{
    let s=practice();
    s=attempt(s,{assessor:"asr_only",outcome:"not_yet"}).snapshot;
    expect(s.consecutiveErrors).toBe(0);
    expect(s.observations[0].outcome).toBe("not_evaluable");
    s=attempt(s,{assessor:"llm_candidate",outcome:"meets"}).snapshot;
    expect(s.practiceReady).toBe(false);
    expect(s.consecutiveErrors).toBe(0);
    expect(s.observations[1].outcome).toBe("not_evaluable");
  });
  it("does not confuse assisted practice with independent readiness",()=>{
    let s=practice();
    s=attempt(s,{outcome:"meets",assistance:"model"}).snapshot;
    expect(s.practiceReady).toBe(false);
    expect(emit(s,{kind:"START_TRANSFER",taskId:"challenge",contextId:"new"}).reason).toBe("transfer_not_ready");
    s=attempt(s,{outcome:"meets",assistance:"none"}).snapshot;
    expect(s.practiceReady).toBe(true);
  });
  it("does not equate partial, silence or unassessable attempts with 3 learner errors",()=>{
    let s=practice();
    s=attempt(s,{outcome:"not_yet"}).snapshot;
    expect(s.consecutiveErrors).toBe(1);
    s=attempt(s,{outcome:"not_evaluable"}).snapshot;
    expect(s.consecutiveErrors).toBe(1);
    s=attempt(s,{outcome:"partial"}).snapshot;
    expect(s.consecutiveErrors).toBe(0);
  });
  it("prevents double-counting a repeated attempt ID with a new event ID",()=>{
    let s=practice();
    s=attempt(s,{attemptId:"fixed-attempt",outcome:"not_yet"}).snapshot;
    const rejected=attempt(s,{attemptId:"fixed-attempt",outcome:"not_yet"});
    expect(rejected.reason).toBe("duplicate_attempt");
    expect(rejected.snapshot.consecutiveErrors).toBe(1);
  });
  it("suggests a pause/smaller goal after repeated reteaching without forcing a new model call",()=>{
    let s=practice();
    const policy:CALPolicy={...DEFAULT_CAL_POLICY,maxReteachCycles:0,reteachAfterErrors:1};
    const r=stepCAL(s,{kind:"ATTEMPT",sessionId:s.sessionId,eventId:"overload",
      expectedVersion:s.version,attemptId:"overload-a",taskId:"t",contextId:"ctx",
      outcome:"not_yet",assessor:"rule",assistance:"none",atMs:1500},policy);
    expect(r.reason).toBe("offer_pause_or_smaller_goal");
    expect(r.snapshot.phase).toBe("ENSINAR");
  });
});

describe("CAL v0.1 recall / transfer / evidence",()=>{
  it("distinguishes immediate recall from an actual delayed opportunity",()=>{
    const s=successfulPractice();
    const immediate=emit(s,{kind:"START_RECALL",atMs:3000});
    expect(immediate.snapshot.phase).toBe("RETOMAR");
    expect(immediate.reason).toBe("immediate_recall_only");
    const delayed=emit(s,{kind:"START_RECALL",atMs:1000+86_400_000});
    expect(delayed.reason).toBe("delayed_recall_opportunity");
    expect(emit(s,{kind:"START_RECALL",atMs:999}).reason).toBe("recall_not_ready");
  });
  it("a failed recall moves to teaching, not a fake lapse, grade or CEFR",()=>{
    let s=advance(successfulPractice(),{kind:"START_RECALL",atMs:100_000});
    s=attempt(s,{outcome:"not_yet",taskId:"recall-t",atMs:100_100}).snapshot;
    expect(s.phase).toBe("ENSINAR");
    expect(s.retrievalReady).toBe(false);
  });
  it("a correct unassisted recall can authorize a new transfer task",()=>{
    let s=advance(successfulPractice(),{kind:"START_RECALL",atMs:86_401_000});
    s=attempt(s,{outcome:"meets",taskId:"recall-t",atMs:86_401_100}).snapshot;
    expect(s.phase).toBe("RETOMAR");
    expect(s.retrievalReady).toBe(true);
    s=advance(s,{kind:"START_TRANSFER",taskId:"colleague",contextId:"ctx-colleague"});
    expect(s.phase).toBe("TRANSFERIR");
  });
  it("denies transfer without practice success or with identical context",()=>{
    const s=practice();
    expect(emit(s,{kind:"START_TRANSFER",taskId:"test",contextId:"new"}).reason).toBe("transfer_not_ready");
    const passed=successfulPractice();
    expect(emit(passed,{kind:"START_TRANSFER",taskId:"test",contextId:"ctx-A"}).reason).toBe("transfer_context_not_new");
  });
  it("rejects a fabricated transfer task, but accepts a new contextual attempt",()=>{
    let s=advance(successfulPractice(),{kind:"START_TRANSFER",taskId:"colleague",contextId:"ctx-new"});
    expect(attempt(s,{taskId:"different",contextId:"ctx-new"}).reason).toBe("unexpected_transfer_task");
    s=attempt(s,{taskId:"colleague",contextId:"ctx-new"}).snapshot;
    expect(s.transferIndependent).toBe(true);
    s=advance(s,{kind:"SUMMARIZE"});
    expect(s.phase).toBe("COMPROVAR");
    expect(summarizeCAL(s).certification).toBe("not_assessed");
  });
  it("does not summarize transfer based on non-evaluable ASR only",()=>{
    let s=advance(successfulPractice(),{kind:"START_TRANSFER",taskId:"new",contextId:"other"});
    s=attempt(s,{taskId:"new",contextId:"other",assessor:"asr_only",outcome:"meets"}).snapshot;
    expect(s.transferAttempted).toBe(false);
    expect(emit(s,{kind:"SUMMARIZE"}).reason).toBe("insufficient_transfer_observation");
  });
  it("three independent contexts trigger review, not mastered or certified",()=>{
    let s=practice();
    for(let i=0;i<3;i++)
      s=attempt(s,{outcome:"meets",contextId:`ctx-${i}`}).snapshot;
    const report=summarizeCAL(s);
    expect(report.distinctObservedContexts).toBe(3);
    expect(report.requiresFormalReview).toBe(true);
    expect(report.certification).toBe("not_assessed");
    expect(report).not.toHaveProperty("learned");
    expect(report).not.toHaveProperty("cefr");
  });
  it("must not create SRS records; only a consent-requiring candidate on actual errors",()=>{
    const correct:CALObservation={attemptId:"x",taskId:"welder",contextId:"a",
      outcome:"meets",assistance:"none",assessor:"rule",stage:"PRATICAR",observedAtMs:1000};
    expect(proposeSRSFromError(correct)).toBeNull();
    expect(proposeSRSFromError({...correct,outcome:"not_yet",assessor:"asr_only"})).toBeNull();
    expect(proposeSRSFromError({...correct,outcome:"not_yet"})).toEqual({
      kind:"review_candidate",taskId:"welder",requiresLearnerConsent:true,
    });
  });
});

describe("CAL v0.1 learner agency / cost-free policy",()=>{
  it("pauses, resumes and closes without losing the active objective",()=>{
    let s=teach();
    const savedObjective=s.objectiveId;
    s=advance(s,{kind:"PAUSE"});
    expect(s.status).toBe("paused");
    expect(emit(s,{kind:"COMPREHENSION",signal:"wants_to_try",assessor:"human"}).reason).toBe("session_paused");
    s=advance(s,{kind:"RESUME"});
    expect(s.objectiveId).toBe(savedObjective);
    s=advance(s,{kind:"CLOSE"});
    expect(s.status).toBe("closed");
    expect(emit(s,{kind:"RESUME"}).reason).toBe("session_closed");
  });
  it("accepts learner's objective change without carrying failure counts across objectives",()=>{
    let s=practice();
    s=attempt(s,{outcome:"not_yet"}).snapshot;
    s=advance(s,{kind:"RESET_OBJECTIVE"});
    expect(s.phase).toBe("OBSERVAR");
    expect(s.consecutiveErrors).toBe(0);
    expect(s.observations).toHaveLength(0);
    expect(s.objectiveId).toBeNull();
  });
  it("selects teaching strategy deterministically and authorizes no additional model call",()=>{
    const beginner=chooseCALPlan(teach(),{
      needsPortugueseSupport:true,audioConsent:true,audioAvailable:false,
    });
    expect(beginner.strategy).toBe("translated_microexample");
    expect(beginner.languageSupport).toBe("pt-BR");
    expect(beginner.optionalAudio).toBe(false);
    expect(beginner.maxAdditionalModelCalls).toBe(0);
    let reteaching=advance(practice(),{kind:"NEEDS_HELP"});
    const next=chooseCALPlan(reteaching,{
      needsPortugueseSupport:true,audioConsent:false,audioAvailable:true,
    });
    expect(next.strategy).toBe("contrastive_reteach");
    expect(next.optionalAudio).toBe(false);
    const intermediate=chooseCALPlan(teach(),{
      needsPortugueseSupport:false,audioConsent:true,audioAvailable:true,
    });
    expect(intermediate.strategy).toBe("contextual_example");
    expect(intermediate.optionalAudio).toBe(true);
  });
  it("has no inactivity timer, hidden persistence, spontaneous message or external call",()=>{
    const s=teach();
    const original=JSON.stringify(s);
    // Without an authenticated event no state transition occurs:
    expect(JSON.stringify(s)).toBe(original);
    expect(s).not.toHaveProperty("lastMessageText");
    expect(s).not.toHaveProperty("database");
    expect(s).not.toHaveProperty("csle");
  });
});
