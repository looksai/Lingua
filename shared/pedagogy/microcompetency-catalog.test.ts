import {describe, expect, it} from "vitest";
import {
  MICROCOMPETENCIES, MICRO_TASKS, getMicrocompetency, getMicrotask,
  validateMicrocatalogue, eligibleMicrocompetencies, evaluateClosedMicrotask,
  type MicroCompetency, type MicroTask,
} from "./microcompetency-catalog";

const task=(id:string)=>{const t=getMicrotask(id);if(!t)throw Error("missing test task");return t;};
const changed=(id:string,overrides:Partial<MicroCompetency>) =>
  MICROCOMPETENCIES.map(c=>c.id===id?{...c,...overrides}:c);
const changedTask=(id:string,overrides:Partial<MicroTask>) =>
  MICRO_TASKS.map(t=>t.id===id?{...t,...overrides}:t);

describe("versioned Naruto catalogue — curricular integrity",()=>{
  it("supplies exactly eight starter microcompetencies and three tasks each",()=>{
    expect(MICROCOMPETENCIES).toHaveLength(8);
    expect(MICRO_TASKS).toHaveLength(24);
    expect(MICROCOMPETENCIES.every(c=>c.version===1 && c.taskIds.length===3)).toBe(true);
    expect(validateMicrocatalogue()).toEqual([]);
  });
  it("has no invented student biography or certification in examples",()=>{
    for(const c of MICROCOMPETENCIES) {
      expect(c.modelEnglish).not.toMatch(/\bcertified\b|\blicensed\b|\b\d+ years\b/i);
      expect(c.objectivePt).not.toMatch(/B[12]|flu[eê]ncia garantida/i);
      expect(c.explanationPt).not.toMatch(/você é soldador|seu nome é Alex/i);
    }
    expect(getMicrocompetency("work.welder-example")?.fictionalPersona).toBe(true);
    expect(getMicrocompetency("identity.my-name")?.fictionalPersona).toBe(true);
  });
  it("finds only known task IDs and competency IDs",()=>{
    expect(getMicrotask("hello.meaning")?.competencyId).toBe("greeting.hello");
    expect(getMicrocompetency("greeting.hello")?.taskIds).toContain("hello.transfer");
    expect(getMicrotask("missing")).toBeNull();
    expect(getMicrocompetency("missing")).toBeNull();
  });
  it("flags duplicate competencies and tasks",()=>{
    expect(validateMicrocatalogue([...MICROCOMPETENCIES,MICROCOMPETENCIES[0]], MICRO_TASKS)
      .some(e=>e.code==="duplicate_competency")).toBe(true);
    expect(validateMicrocatalogue(MICROCOMPETENCIES,[...MICRO_TASKS,MICRO_TASKS[0]])
      .some(e=>e.code==="duplicate_task")).toBe(true);
  });
  it("flags circular, self-referential and missing prerequisites",()=>{
    expect(validateMicrocatalogue(changed("greeting.hello",{prerequisites:["conversation.what-do-you-do"]}))
      .some(e=>e.code==="prerequisite_cycle")).toBe(true);
    expect(validateMicrocatalogue(changed("greeting.hello",{prerequisites:["greeting.hello"]}))
      .some(e=>e.code==="prerequisite_cycle")).toBe(true);
    expect(validateMicrocatalogue(changed("greeting.hello",{prerequisites:["ghost.unknown"]}))
      .some(e=>e.code==="unknown_prerequisite")).toBe(true);
  });
  it("rejects dangling and foreign task references",()=>{
    expect(validateMicrocatalogue(changed("greeting.hello",{taskIds:["hello.meaning","hello.expression","thanks.transfer"]}))
      .some(e=>e.code==="missing_or_foreign_task")).toBe(true);
    expect(validateMicrocatalogue(changed("greeting.hello",{taskIds:["hello.meaning","hello.expression","missing.unknown"]}))
      .some(e=>e.code==="missing_or_foreign_task")).toBe(true);
  });
  it("detects invalid or duplicate accepted answers",()=>{
    expect(validateMicrocatalogue(MICROCOMPETENCIES,changedTask("hello.meaning",{acceptedAnswers:["Olá","olá"]}))
      .some(e=>e.code==="invalid_closed_answer")).toBe(true);
    expect(validateMicrocatalogue(MICROCOMPETENCIES,changedTask("hello.meaning",{acceptedAnswers:[]}))
      .some(e=>e.code==="invalid_closed_answer")).toBe(true);
  });
  it("forbids automatic grades for open transfer tasks",()=>{
    expect(MICRO_TASKS.filter(t=>t.mode==="open_transfer")).toHaveLength(8);
    for(const t of MICRO_TASKS.filter(x=>x.mode==="open_transfer")){
      expect(t.assessor).toBe("requires_review");
      expect(t.acceptedAnswers).toEqual([]);
      expect(t.assistance).toBe("none");
    }
    expect(validateMicrocatalogue(MICROCOMPETENCIES,changedTask("hello.transfer",{
      acceptedAnswers:["Hello"],assessor:"trusted_closed_rule",
    })).some(e=>e.code==="open_task_must_be_reviewed")).toBe(true);
  });
  it("marks eligibility as prerequisites, never as learning proof",()=>{
    const first=eligibleMicrocompetencies(new Set());
    expect(first.map(c=>c.id)).toEqual(["greeting.hello"]);
    const next=eligibleMicrocompetencies(new Set(["greeting.hello"]));
    expect(next.map(c=>c.id)).toContain("greeting.good-morning");
    expect(next.map(c=>c.id)).not.toContain("courtesy.thank-you");
  });
});

describe("closed-answer candidate checker — narrow and conservative",()=>{
  it("recognizes case, punctuation and Portuguese accents for a lexical item",()=>{
    expect(evaluateClosedMicrotask(task("hello.meaning"),"Olá!").outcome).toBe("meets");
    expect(evaluateClosedMicrotask(task("hello.meaning")," oi  ").outcome).toBe("meets");
    expect(evaluateClosedMicrotask(task("thanks.meaning"),"Obrigada.").outcome).toBe("meets");
    expect(evaluateClosedMicrotask(task("morning.meaning"),"Bom dia").outcome).toBe("meets");
  });
  it("rejects clearly wrong closed answers without interpreting free dialogue",()=>{
    expect(evaluateClosedMicrotask(task("hello.meaning"),"Tchau").outcome).toBe("not_yet");
    expect(evaluateClosedMicrotask(task("please.expression"),"Thank you").outcome).toBe("not_yet");
  });
  it("never evaluates a question, silence or request for help as an error",()=>{
    for(const answer of ["", "Não sei", "Não entendi", "Repete", "Ajuda", "O que é Hello?", "  "])
      expect(evaluateClosedMicrotask(task("hello.meaning"),answer).outcome).toBe("not_evaluable");
  });
  it("never treats ASR text as acoustic pronunciation proof",()=>{
    const r=evaluateClosedMicrotask(task("hello.expression"),"Hello","asr_text");
    expect(r.outcome).toBe("not_evaluable");
    expect(r.reason).toBe("asr_cannot_certify_correctness");
  });
  it("never auto-grades open transfer regardless of response",()=>{
    const r=evaluateClosedMicrotask(task("name.transfer"),"My name is Jo.");
    expect(r.outcome).toBe("not_evaluable");
    expect(r.reason).toBe("requires_contextual_review");
  });
  it("truncation/oversized input cannot be a closed-answer success",()=>{
    expect(evaluateClosedMicrotask(task("hello.expression"),"Hello".repeat(40)).outcome).toBe("not_evaluable");
  });
  it("only emits a rule candidate — no mastery, CEFR or persistent evidence",()=>{
    const r=evaluateClosedMicrotask(task("welder.meaning"),"Sou soldador");
    expect(r).toEqual({
      outcome:"meets",assessor:"rule_candidate",reason:"closed_form_match_only",
    });
    expect(r).not.toHaveProperty("mastered");
    expect(r).not.toHaveProperty("learnerId");
    expect(r).not.toHaveProperty("cefr");
    expect(r).not.toHaveProperty("srs");
  });
  it("has examples for professional and conversational English without inventing user facts",()=>{
    expect(evaluateClosedMicrotask(task("welder.expression"),"I am a welder").outcome).toBe("meets");
    expect(evaluateClosedMicrotask(task("occupation.meaning"),"Com o que você trabalha?").outcome)
      .toBe("not_evaluable"); // question form is not a validated response in this conservative checker
    expect(evaluateClosedMicrotask(task("occupation.expression"),"What do you do").outcome).toBe("meets");
  });
});
