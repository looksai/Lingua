import { describe, expect, it, vi } from "vitest";
import { calDirective, calEnabled, CALTutorSessions } from "./cal-integration";
import { createGroqTutor } from "./tutor-free-provider";
import { createOpenAITutor } from "./tutor-provider";
import type { TutorProfile } from "../shared/tutor";

const profile:TutorProfile={tutorName:"Naruto",tutorPersona:"welcoming",interest:"work"};
const first="Não sei nada de inglês. Quero começar do zero.";
const teaching="Entendi! **Hello** significa **Olá**. O que significa Hello em português?";
const practice="Boa tentativa. Como você cumprimentaria alguém em inglês?";
const sessions=()=>new CALTutorSessions(()=>5000);
const open=(s:CALTutorSessions, uid=10)=>{
  const p=s.prepare(uid,first,true);
  expect(p).not.toBeNull();
  expect(p?.phase).toBe("ENSINAR");
  expect(p?.strategy).toBe("translated_microexample");
  p?.commit(teaching);
};
const moveToPractice=(s:CALTutorSessions,uid=10)=>{
  open(s,uid);
  const p=s.prepare(uid,"Olá",true);
  expect(p?.phase).toBe("PRATICAR");
  expect(p?.directive).toContain("tentativa anterior foi compatível");
  p?.commit(practice);
};

describe("CAL feature flag and no-regression contract",()=>{
  it("disabled by default; only exactly true enables it",()=>{
    expect(calEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(calEnabled({CAL_ENABLED:"false"} as NodeJS.ProcessEnv)).toBe(false);
    expect(calEnabled({CAL_ENABLED:"TRUE"} as NodeJS.ProcessEnv)).toBe(false);
    expect(calEnabled({CAL_ENABLED:"true"} as NodeJS.ProcessEnv)).toBe(true);
  });
  it("is opt-in by real learner study request, not by an arbitrary question",()=>{
    const s=sessions();
    expect(s.prepare(10,"Naruto, com o que eu trabalho?",true)).toBeNull();
    expect(s.inspectForTest(10)).toBeNull();
    expect(s.prepare(-1,first,true)).toBeNull();
    expect(s.prepare(10,first,true)?.phase).toBe("ENSINAR");
  });
  it("computes a fixed server directive that does not invent qualifications/CEFR",()=>{
    const s=sessions(),p=s.prepare(10,first,true);
    expect(p?.directive).toContain("Hello = Olá");
    expect(p?.directive).toContain("O que significa Hello");
    expect(p?.directive).toContain("Não invente");
    expect(p?.directive).not.toContain("certified");
    expect(p?.directive).not.toContain("CSLE");
  });
  it("does not start or mutate session after provider failure",()=>{
    const s=sessions();
    s.prepare(10,first,true);
    expect(s.inspectForTest(10)).toBeNull();
    const preview=s.prepare(10,first,true);
    preview?.commit("");
    expect(s.inspectForTest(10)).toBeNull();
  });
  it("a model reply without the closed question can never be graded",()=>{
    const s=sessions(),p=s.prepare(10,first,true);
    p?.commit("Hello significa Olá. Quer conversar sobre trabalho?");
    expect(s.inspectForTest(10)?.pending).toBeNull();
    const next=s.prepare(10,"Olá",true);
    expect(next?.phase).toBe("ENSINAR");
  });
  it("an unsafe or untrusted LLM reply is not considered learner evidence",()=>{
    const s=sessions(),p=s.prepare(10,first,true);
    p?.commit("I am a certified welder with 20 years of experience.");
    const state=s.inspectForTest(10);
    expect(state?.snapshot.observations).toHaveLength(0);
    expect(state?.pending).toBeNull();
  });
});

describe("CAL closed exercise: observe → teach → practice (pilot)",()=>{
  it("does not grade an answer unless the specific question was delivered",()=>{
    const s=sessions();
    open(s);
    expect(s.inspectForTest(10)?.snapshot.phase).toBe("ENSINAR");
    expect(s.inspectForTest(10)?.pending).toBe("meaning");
    const r=s.prepare(10,"Olá",true);
    expect(r?.phase).toBe("PRATICAR");
    expect(s.inspectForTest(10)?.snapshot.phase).toBe("ENSINAR"); // no commit until AI succeeds
    r?.commit(practice);
    expect(s.inspectForTest(10)?.snapshot.phase).toBe("PRATICAR");
  });
  it("a mere 'entendi' cannot prove comprehension",()=>{
    const s=sessions();open(s);
    const r=s.prepare(10,"Entendi",true);
    expect(r?.phase).toBe("ENSINAR");
    r?.commit(teaching);
    expect(s.inspectForTest(10)?.snapshot.phase).toBe("ENSINAR");
  });
  it("short wrong translation is not a false positive",()=>{
    const s=sessions();open(s);
    const r=s.prepare(10,"tchau",true);
    expect(r?.phase).toBe("ENSINAR");
    expect(r?.directive).toContain("diferente do gabarito");
    r?.commit(teaching);
    expect(s.inspectForTest(10)?.snapshot.observations).toHaveLength(0);
  });
  it("an unrelated learner question bypasses the fixed task without grading or losing session",()=>{
    const s=sessions();open(s);
    const before=s.inspectForTest(10)?.snapshot;
    const r=s.prepare(10,"Como se escreve soldador em inglês?",true);
    expect(r).toBeNull();
    const after=s.inspectForTest(10)?.snapshot;
    expect(after).toBe(before);
    expect(after?.phase).toBe("ENSINAR");
    expect(after?.observations).toHaveLength(0);
    expect(s.inspectForTest(10)?.pending).toBe("meaning");
  });
  it("does not mark a read-and-repeat task as independent mastery",()=>{
    const s=sessions();moveToPractice(s);
    const r=s.prepare(10,"Hello",true);
    expect(r?.phase).toBe("PRATICAR");
    r?.commit(practice);
    const obs=s.inspectForTest(10)?.snapshot.observations;
    expect(obs).toHaveLength(1);
    expect(obs?.[0].outcome).toBe("meets");
    expect(obs?.[0].assistance).toBe("model");
    expect(s.inspectForTest(10)?.snapshot.practiceReady).toBe(false);
  });
  it("three trusted wrong closed answers lead to a different teaching strategy",()=>{
    const s=sessions();moveToPractice(s);
    for(let i=0;i<2;i++){
      const r=s.prepare(10,"goodbye",true);
      expect(r?.phase).toBe("PRATICAR");
      r?.commit(practice);
    }
    const third=s.prepare(10,"goodbye",true);
    expect(third?.phase).toBe("ENSINAR");
    expect(third?.strategy).toBe("contrastive_reteach");
    third?.commit(teaching);
    expect(s.inspectForTest(10)?.snapshot.reteachCycles).toBe(1);
    expect(s.inspectForTest(10)?.snapshot.consecutiveErrors).toBe(0);
  });
  it("student help request is never counted as an error",()=>{
    const s=sessions();moveToPractice(s);
    const r=s.prepare(10,"não sei",true);
    expect(r?.phase).toBe("ENSINAR");
    r?.commit(teaching);
    expect(s.inspectForTest(10)?.snapshot.consecutiveErrors).toBe(0);
  });
  it("same account has provisional state, a different account starts independently",()=>{
    const s=sessions();open(s,1);
    expect(s.prepare(2,"Naruto, com o que eu trabalho?",true)).toBeNull();
    const other=s.prepare(2,first,true);
    other?.commit(teaching);
    expect(s.inspectForTest(1)?.snapshot.sessionId)
      .not.toBe(s.inspectForTest(2)?.snapshot.sessionId);
    expect(s.inspectForTest(1)?.snapshot.observations).toHaveLength(0);
  });
  it("a duplicate commit of the same model reply does not replay learner evidence",()=>{
    const s=sessions();moveToPractice(s);
    const r=s.prepare(10,"hello",true);
    expect(r?.commit(practice)).not.toBeNull();
    expect(r?.commit(practice)).toBeNull();
    expect(s.inspectForTest(10)?.snapshot.observations).toHaveLength(1);
  });
  it("two stale requests cannot overwrite a newer CAL snapshot",()=>{
    const s=sessions();
    const first=s.prepare(10,"quero aprender",true);
    const competing=s.prepare(10,"quero aprender",true);
    first?.commit(teaching);
    expect(competing?.commit(teaching)).toBeNull();
    expect(s.inspectForTest(10)?.snapshot.phase).toBe("ENSINAR");
  });
  it("pause/resume and idle expiry are supported without timers or unsolicited pings",()=>{
    let now=10_000;const s=new CALTutorSessions(()=>now);
    const p=s.prepare(10,first,true);p?.commit(teaching);
    expect(s.prepare(10,"quero parar",true)).toBeNull();
    expect(s.inspectForTest(10)?.snapshot.status).toBe("paused");
    expect(s.prepare(10,"Olá",true)).toBeNull();
    const r=s.prepare(10,"vamos continuar",true);
    expect(r?.phase).toBe("ENSINAR");
    r?.commit(teaching);
    now+=31*60_000;
    expect(s.prepare(10,"Olá",true)).toBeNull();
    expect(s.inspectForTest(10)).toBeNull();
  });
});

describe("CAL directive forwarded to existing providers at one-call cost",()=>{
  it("Groq receives CAL only when requested and does not fabricate evaluator fields",async()=>{
    const answer=JSON.stringify({resposta:teaching,memoria:null});
    const fake=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({choices:[{message:{content:answer}}]})));
    const g=createGroqTutor({GROQ_API_KEY:"fake"},fake);
    const directive=calDirective("ENSINAR","translated_microexample",null);
    await g.replyWithProposal(profile,[],first,[],directive);
    const body=JSON.parse(String(fake.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("PILOTO CAL v0.1");
    expect(body.messages[0].content).toContain("Nunca invente fatos");
    expect(fake).toHaveBeenCalledOnce();
  });
  it("OpenAI receives CAL only as an optional additive system hint",async()=>{
    const fake=vi.fn<typeof fetch>().mockImplementation(async()=>
      new Response(JSON.stringify({choices:[{message:{content:teaching}}]})));
    const ai=createOpenAITutor({OPENAI_API_KEY:"fake"},fake);
    await ai.reply(profile,[],first,[],calDirective("ENSINAR","translated_microexample",null));
    const body=JSON.parse(String(fake.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("PILOTO CAL");
    expect(fake).toHaveBeenCalledOnce();
    await ai.reply(profile,[],first,[]);
    const off=JSON.parse(String(fake.mock.calls[1][1]?.body));
    expect(off.messages[0].content).not.toContain("PILOTO CAL");
  });
});
