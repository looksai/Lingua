import {describe,expect,it} from "vitest";
import {
  newCatalogCALSession,listCatalogOptions,chooseCatalogObjective,
  issueCatalogTask,attestCatalogTaskDelivery,respondToCatalogTask,
  resumeCatalogSession,summarizeCatalogSession,
  type CatalogCALSession,
} from "./cal-catalog-adapter";
import {getMicrocompetency} from "./microcompetency-catalog";

const USER=876;
const fresh=(id=USER,sessionId="synthetic-learning-session")=>newCatalogCALSession(id,sessionId);
const choose=(session:CatalogCALSession,comp="greeting.hello")=>
  chooseCatalogObjective(session,session.ownerUserId,comp).session;
const issue=(session:CatalogCALSession)=>{
  const r=issueCatalogTask(session,session.ownerUserId,true);
  expect(r.outcome,r.reason).toBe("accepted");
  expect(r.plan?.maxAdditionalModelCalls).toBe(0);
  expect(r.session.task).not.toBeNull();
  return r.session;
};
const show=(session:CatalogCALSession,atMs=1000)=>{
  const ticket=session.task!;
  const r=attestCatalogTaskDelivery(
    session,session.ownerUserId,ticket.deliveryId,ticket.promptText,atMs);
  expect(r.outcome,r.reason).toBe("accepted");
  return r.session;
};
const answer=(session:CatalogCALSession,text:string,atMs=1500,kind="explicit_answer" as const)=>{
  return respondToCatalogTask(session,session.ownerUserId,{
    kind,text,modality:"typed",attemptedAtMs:atMs,
  });
};
const teaching=(comp="greeting.hello")=>show(issue(choose(fresh(),comp)));
const practice=(comp="greeting.hello",response="Olá")=>{
  const taught=teaching(comp);
  const r=answer(taught,response);
  expect(r.outcome,r.reason).toBe("accepted");
  expect(r.session.cal.phase).toBe("PRATICAR");
  return show(issue(r.session),2000);
};
describe("Catalog → CAL adapter v0.1: objectives and identity",()=>{
  it("opens an isolated synthetic session without any student data or competence",()=>{
    const s=fresh();
    expect(s.cal.phase).toBe("OBSERVAR");
    expect(s.selectedCompetencyId).toBeNull();
    expect(s.task).toBeNull();
    expect(s).not.toHaveProperty("learnerMemories");
    expect(s).not.toHaveProperty("cefr");
    expect(()=>fresh(0)).toThrow("authenticated_user_id_required");
    expect(()=>fresh(USER,"")).toThrow("sessionId");
  });
  it("lists all 8 choices and allows filtering without claiming verified prerequisites",()=>{
    expect(listCatalogOptions()).toHaveLength(8);
    const works=listCatalogOptions("work");
    expect(works.map(x=>x.competencyId)).toEqual(["work.welder-example"]);
    expect(works[0]).not.toHaveProperty("mastered");
  });
  it("lets student choose work directly without imposing Hello as compulsory first step",()=>{
    const s=fresh();
    const r=chooseCatalogObjective(s,USER,"work.welder-example");
    expect(r.outcome).toBe("accepted");
    expect(r.session.cal.objectiveId).toBe("work.welder-example");
    expect(r.session.cal.phase).toBe("ENSINAR");
    expect(r.missingPrerequisites).toContain("identity.my-name");
    const plan=issueCatalogTask(r.session,USER,true);
    expect(plan.session.task?.promptText).toContain("I am a welder");
    expect(plan.session.task?.promptText).not.toContain("Hello");
  });
  it("discloses unverified bridges, never infers mastery from chosen objective",()=>{
    const s=fresh();
    const r=chooseCatalogObjective(s,USER,"greeting.good-morning",new Set());
    expect(r.missingPrerequisites).toEqual(["greeting.hello"]);
    expect(r.session.cal.objectiveId).toBe("greeting.good-morning");
    const v=chooseCatalogObjective(s,USER,"greeting.good-morning",new Set(["greeting.hello"]));
    expect(v.missingPrerequisites).toEqual([]);
    expect(v.session).not.toHaveProperty("learned");
  });
  it("never selects unknown IDs or lets another authenticated account access session",()=>{
    const s=fresh();
    expect(chooseCatalogObjective(s,USER,"unknown").reason).toBe("unknown_competency");
    expect(chooseCatalogObjective(s,USER+1,"greeting.hello").reason).toBe("wrong_account");
    expect(issueCatalogTask(s,USER+1,true).reason).toBe("wrong_account");
    expect(s.cal.phase).toBe("OBSERVAR");
  });
  it("a new explicit goal resets the old synthetic objective without carrying its errors",()=>{
    const s=practice();
    const wrong=answer(s,"Goodbye");
    expect(wrong.session.cal.consecutiveErrors).toBe(1);
    const next=chooseCatalogObjective(wrong.session,USER,"identity.my-name");
    expect(next.session.selectedCompetencyId).toBe("identity.my-name");
    expect(next.session.cal.phase).toBe("ENSINAR");
    expect(next.session.cal.consecutiveErrors).toBe(0);
    expect(next.session.cal.observations).toHaveLength(0);
    expect(next.missingPrerequisites).toContain("greeting.hello");
  });
  it("a redundant selection is a no-op (not a second fake teaching event)",()=>{
    const s=choose(fresh());
    const result=chooseCatalogObjective(s,USER,"greeting.hello");
    expect(result.outcome).toBe("bypassed");
    expect(result.session).toBe(s);
  });
});
describe("Task presentation contract: PLAN ≠ DELIVERY ≠ learning",()=>{
  it("cannot create an observation before a real host-attested template",()=>{
    const s=issue(choose(fresh()));
    expect(s.task?.delivered).toBe(false);
    expect(s.cal.lastTaughtAtMs).toBeNull();
    expect(answer(s,"Olá").reason).toBe("no_attested_task");
    expect(s.cal.phase).toBe("ENSINAR");
  });
  it("rejects a fake question, wrong ticket, replay and different account",()=>{
    const s=issue(choose(fresh()));
    const ticket=s.task!;
    expect(attestCatalogTaskDelivery(s,USER,"forged",ticket.promptText,1000).reason)
      .toBe("stale_or_wrong_delivery");
    expect(attestCatalogTaskDelivery(s,USER,ticket.deliveryId,"A IA mencionou Hello",1000).reason)
      .toBe("rendered_prompt_mismatch");
    expect(attestCatalogTaskDelivery(s,USER+1,ticket.deliveryId,ticket.promptText,1000).reason)
      .toBe("wrong_account");
    const displayed=show(s);
    expect(displayed.cal.lastTaughtAtMs).toBe(1000);
    expect(attestCatalogTaskDelivery(displayed,USER,ticket.deliveryId,ticket.promptText,1000).reason)
      .toBe("delivery_already_attested");
  });
  it("the task prompt comes from the approved catalog, not free LLM text",()=>{
    const s=teaching("identity.my-name");
    const catalog=getMicrocompetency("identity.my-name")!;
    expect(s.task?.promptText).toContain(catalog.modelEnglish);
    expect(s.task?.promptText).toContain("Alex");
    expect(s).not.toHaveProperty("studentName");
    expect(s.cal.observations).toEqual([]);
  });
  it("can not issue another question while one is pending",()=>{
    const s=issue(choose(fresh()));
    expect(issueCatalogTask(s,USER,true).reason).toBe("task_already_pending");
  });
  it("with no selected objective, planning is rejected rather than starting Hello",()=>{
    const r=issueCatalogTask(fresh(),USER,true);
    expect(r.reason).toBe("objective_not_selected");
    expect(r.session.cal.phase).toBe("OBSERVAR");
  });
});
describe("Closed task observation and learner agency",()=>{
  it("correct comprehension moves ENSINAR → PRATICAR, never mastery",()=>{
    const s=teaching();
    const r=answer(s,"Olá!");
    expect(r.reason).toBe("closed_candidate_meets");
    expect(r.candidate?.assessor).toBe("rule_candidate");
    expect(r.session.cal.phase).toBe("PRATICAR");
    expect(r.session.cal.observations).toHaveLength(0);
    expect(summarizeCatalogSession(r.session).certification).toBe("not_assessed");
  });
  it("wrong but known lexical distractor in ENSINAR is not a triple-error counter",()=>{
    const s=teaching();
    const r=answer(s,"Tchau");
    expect(r.candidate?.outcome).toBe("not_yet");
    expect(r.session.cal.phase).toBe("ENSINAR");
    expect(r.session.cal.consecutiveErrors).toBe(0);
    expect(r.session.task).toBeNull();
  });
  it("an unknown answer/changed goal is not a wrong attempt",()=>{
    const s=teaching();
    for(const text of ["Quero inglês para entrevista","Eu trabalho numa oficina","Me mostre um exemplo diferente"]) {
      const r=answer(s,text);
      expect(r.outcome,text).toBe("bypassed");
      expect(r.candidate?.outcome).toBe("not_evaluable");
      expect(r.session).toBe(s);
    }
    expect(s.cal.observations).toHaveLength(0);
  });
  it("a malformed legacy explicit answer with missing modality is never typed by default",()=>{
    const s=teaching();
    const original=structuredClone(s);
    const malformed={kind:"explicit_answer",text:"Olá",attemptedAtMs:1500} as
      unknown as Parameters<typeof respondToCatalogTask>[2];
    const r=respondToCatalogTask(s,USER,malformed);
    expect(r.outcome).toBe("bypassed");
    expect(r.reason).toBe("asr_cannot_certify_correctness");
    expect(r.session).toBe(s);
    expect(s).toEqual(original);
    expect(s.cal.observations).toHaveLength(0);
  });
  it("future callers must keep modality explicit for a typed closed response",()=>{
    const s=teaching();
    const r=respondToCatalogTask(s,USER,{kind:"explicit_answer",text:"Olá",
      modality:"typed",attemptedAtMs:1500});
    expect(r.outcome).toBe("accepted");
    expect(r.session.cal.phase).toBe("PRATICAR");
  });
  it("spoken transcription and questions cannot be graded as closed task evidence",()=>{
    const s=teaching();
    const asr=respondToCatalogTask(s,USER,{
      kind:"explicit_answer",text:"Olá",modality:"asr_text",attemptedAtMs:1500,
    });
    expect(asr.outcome).toBe("bypassed");
    expect(asr.reason).toBe("asr_cannot_certify_correctness");
    const question=respondToCatalogTask(s,USER,{kind:"question",text:"E como eu digo outra coisa?",attemptedAtMs:1500});
    expect(question.outcome).toBe("bypassed");
    expect(question.session).toBe(s);
  });
  it("free-text intent can suspend a task without changing the learner state",()=>{
    const s=practice();
    for(const kind of ["question","change_objective","unclear"] as const){
      const r=respondToCatalogTask(s,USER,{kind,attemptedAtMs:2200});
      expect(r.outcome).toBe("bypassed");
      expect(r.session).toBe(s);
    }
    expect(s.cal.consecutiveErrors).toBe(0);
  });
  it("student help means reteach, never failed answer",()=>{
    const s=practice();
    const r=respondToCatalogTask(s,USER,{kind:"help",attemptedAtMs:2300});
    expect(r.reason).toBe("reteach_requested_not_error");
    expect(r.session.cal.phase).toBe("ENSINAR");
    expect(r.session.cal.consecutiveErrors).toBe(0);
    expect(r.session.task).toBeNull();
  });
  it("a correct copied answer is assisted, so practice does not certify retention",()=>{
    const s=practice();
    const r=answer(s,"Hello");
    expect(r.candidate?.outcome).toBe("meets");
    expect(r.session.cal.observations).toHaveLength(1);
    expect(r.session.cal.observations[0].assistance).toBe("model");
    expect(r.session.cal.practiceReady).toBe(false);
    expect(summarizeCatalogSession(r.session).certification).toBe("not_assessed");
  });
  it("three actual closed-practice errors trigger strategy change (not an automatic pass)",()=>{
    let s=practice();
    for(let i=0;i<3;i++){
      const r=answer(s,"Goodbye",2000+i);
      expect(r.outcome).toBe("accepted");
      s=r.session;
      if(i<2) {
        expect(s.cal.phase).toBe("PRATICAR");
        s=show(issue(s),2100+i);
      }
    }
    expect(s.cal.phase).toBe("ENSINAR");
    expect(s.cal.reteachCycles).toBe(1);
    expect(s.cal.consecutiveErrors).toBe(0);
    expect(summarizeCatalogSession(s).certification).toBe("not_assessed");
  });
  it("double submitting an old ticket cannot count twice",()=>{
    const s=practice();
    const a=answer(s,"Goodbye");
    expect(a.session.cal.observations).toHaveLength(1);
    expect(answer(a.session,"Goodbye").reason).toBe("no_attested_task");
    expect(a.session.cal.consecutiveErrors).toBe(1);
  });
  it("the same task ID in another account does not authorize cross-account submission",()=>{
    const s=practice();
    expect(respondToCatalogTask(s,999,{kind:"explicit_answer",text:"Goodbye",modality:"typed",attemptedAtMs:2300}).reason)
      .toBe("wrong_account");
    expect(s.cal.observations).toHaveLength(0);
  });
});
describe("Pause, resume and no invented transfer/certification",()=>{
  it("pauses voluntarily and can resume without progress loss or an intrusive timer",()=>{
    const s=practice();
    const r=respondToCatalogTask(s,USER,{kind:"pause",attemptedAtMs:2300});
    expect(r.session.cal.status).toBe("paused");
    expect(r.session.task).toBeNull();
    expect(issueCatalogTask(r.session,USER,true).reason).toBe("session_not_active");
    const resumed=resumeCatalogSession(r.session,USER);
    expect(resumed.session.cal.status).toBe("active");
    expect(resumed.session.cal.phase).toBe("PRATICAR");
  });
  it("unverified prerequisites cannot be silently converted to learned labels",()=>{
    const s=choose(fresh(),"conversation.what-do-you-do");
    expect(s.cal.phase).toBe("ENSINAR");
    const r=issueCatalogTask(s,USER,true);
    expect(r.session.task?.competencyId).toBe("conversation.what-do-you-do");
    expect(r.session).not.toHaveProperty("approvedCompetencies");
    expect(r.session).not.toHaveProperty("cefr");
  });
  it("after teaching and practice, no independent proof can be faked for RETOMAR",()=>{
    const s=answer(practice(),"Hello").session;
    expect(s.cal.practiceReady).toBe(false);
    expect(s.cal.phase).toBe("PRATICAR");
    expect(summarizeCatalogSession(s)).toMatchObject({
      independentAttempts:0,transferAttempts:0,certification:"not_assessed",
    });
  });
  it("provides no side effect or automatic SRS/CSLE update",()=>{
    const s=answer(practice(),"Goodbye").session;
    expect(Object.keys(s)).toEqual([
      "sessionId","ownerUserId","revision","cal","selectedCompetencyId","task",
    ]);
    expect(s).not.toHaveProperty("srs");
    expect(s).not.toHaveProperty("csle");
    expect(s).not.toHaveProperty("learnerEvidence");
  });
});
