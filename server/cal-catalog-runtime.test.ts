import {describe,expect,it,vi} from "vitest";
import {diagnoseCALProof} from "../shared/pedagogy/cal-proof-diagnostics";
import {
  CALCatalogTutorSessions,catalogCALRuntimeEnabled,explicitCatalogGoal,
} from "./cal-catalog-runtime";

const ID=88881;
const create=()=>{let ms=1000;return {clock:()=>ms,skip:(n:number)=>{ms+=n;},
  sessions:new CALCatalogTutorSessions(()=>ms)};};
function start(s:CALCatalogTutorSessions,id=ID,goal="Quero aprender a me apresentar"){
  const preview=s.prepare(id,goal,true,undefined,"typed");
  expect(preview).not.toBeNull();
  expect(s.inspectForTest(id)).toBeNull(); // model not yet returned
  const text=preview!.complete("Vamos praticar com calma.");
  expect(text).toContain("Tradução:");
  const current=s.inspectForTest(id);
  expect(current?.task?.delivered).toBe(true);
  expect(current?.cal.phase).toBe("ENSINAR");
  return {text,current:current!,preview:preview!};
}
describe("opt-in catalogue runtime controller",()=>{
  it("requires both the existing CAL flag and a separate catalogue flag",()=>{
    expect(catalogCALRuntimeEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(catalogCALRuntimeEnabled({CAL_ENABLED:"true"} as NodeJS.ProcessEnv)).toBe(false);
    expect(catalogCALRuntimeEnabled({CAL_CATALOG_ENABLED:"true"} as NodeJS.ProcessEnv)).toBe(false);
    expect(catalogCALRuntimeEnabled({CAL_ENABLED:"true",CAL_CATALOG_ENABLED:"true"} as NodeJS.ProcessEnv)).toBe(true);
    expect(catalogCALRuntimeEnabled({CAL_ENABLED:"true",CAL_CATALOG_ENABLED:"TRUE"} as NodeJS.ProcessEnv)).toBe(false);
  });
  it("only interprets explicit teaching intents; not biography or off-topic needs",()=>{
    expect(explicitCatalogGoal("Sou soldador MIG/TIG")).toBeNull();
    expect(explicitCatalogGoal("Trabalho com solda")).toBeNull();
    expect(explicitCatalogGoal("Quero aprender a pedir direções")).toBeNull();
    expect(explicitCatalogGoal("Me dê informações sobre entrevista")).toBeNull();
    expect(explicitCatalogGoal("Quero aprender a me apresentar")).toBe("identity.my-name");
    expect(explicitCatalogGoal("Quero aprender a falar da minha profissão")).toBe("work.welder-example");
    expect(explicitCatalogGoal("Quero praticar bom dia")).toBe("greeting.good-morning");
    expect(explicitCatalogGoal("Quero aprender a agradecer")).toBe("courtesy.thank-you");
    expect(explicitCatalogGoal("Quero praticar perguntar a profissão")).toBe("conversation.what-do-you-do");
  });
  it("offers a real choice for an unspecific English goal, no automatic lesson",()=>{
    const s=create().sessions;
    const intro=s.prepare(ID,"Não sei nada de inglês e quero aprender do zero.",true,undefined,"typed");
    expect(intro).not.toBeNull();
    const txt=intro!.complete("Tudo bem!");
    expect(txt).toContain("Escolha um:");
    expect(txt).toContain("profissão");
    expect(s.inspectForTest(ID)).toBeNull();
  });
  it("selects vocational goal explicitly without any forced Hello or personal facts",()=>{
    const s=create().sessions;
    const {text,current}=start(s,ID,"Quero aprender a falar da minha profissão");
    expect(current.selectedCompetencyId).toBe("work.welder-example");
    expect(text).toContain("I am a welder");
    expect(text).not.toContain("Hello");
    expect(text).toContain("fictício");
    expect(current.cal.observations).toHaveLength(0);
  });
  it("also supports a controlled future UI goal ID; never trusts a fake ID",()=>{
    const s=create().sessions;
    expect(s.prepare(ID,"Selecionar",true,"invalid.unknown","typed")).toBeNull();
    expect(s.inspectForTest(ID)).toBeNull();
    const p=s.prepare(ID,"Quero esta lição",true,"courtesy.please","typed");
    const txt=p!.complete("Certo.");
    expect(txt).toContain("Please");
    expect(s.inspectForTest(ID)?.selectedCompetencyId).toBe("courtesy.please");
  });
  it("does not commit teaching until a safe response is returned by the host",()=>{
    const s=create().sessions;
    const p=s.prepare(ID,"Quero aprender a me apresentar",true,undefined,"typed");
    expect(p).not.toBeNull();
    expect(s.inspectForTest(ID)).toBeNull();
  });
  it("a correct closed answer moves ENSINAR -> PRATICAR but not mastery",()=>{
    const s=create().sessions;
    start(s,ID,"Quero praticar Hello");
    const p=s.prepare(ID,"Olá",true,undefined,"typed");
    expect(p?.directive).toContain("PRATICAR");
    expect(s.inspectForTest(ID)?.cal.phase).toBe("ENSINAR");
    const reply=p!.complete("Muito bem!");
    expect(reply).toContain("Como você escreveria Olá em inglês?");
    const state=s.inspectForTest(ID)!;
    expect(state.cal.phase).toBe("PRATICAR");
    expect(state.cal.observations).toHaveLength(0);
    expect(state.task?.delivered).toBe(true);
  });
  it("a guided practice success is acknowledged without certifying learning",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    s.prepare(ID,"Olá",true,undefined,"typed")!.complete("Certo!");
    const answer=s.prepare(ID,"Hello",true,undefined,"typed")!;
    expect(answer.directive).toContain("closed_candidate_meets");
    const msg=answer.complete("Você se esforçou.");
    expect(msg).toContain("não comprova domínio");
    expect(s.inspectForTest(ID)?.cal.observations).toHaveLength(1);
    expect(s.inspectForTest(ID)?.cal.observations[0].assistance).toBe("model");
    const diagnostic=diagnoseCALProof(s.inspectForTest(ID)!.cal);
    expect(diagnostic.practiceCandidate).toBe(false);
    expect(diagnostic.delayedRecallCandidate).toBe(false);
    expect(diagnostic.novelContextTransferCandidate).toBe(false);
    expect(diagnostic.boundedSummaryCandidate).toBe(false);
    expect(diagnostic.liveTutorValidated).toBe(false);
    expect(diagnostic.certification).toBe("not_assessed");
    expect(s.inspectForTest(ID)?.task).toBeNull();
    expect(s.prepare(ID,"Quero mudar para entrevista",true,undefined,"typed")).toBeNull();
  });
  it("unknown text is neither graded nor a change of objective",()=>{
    const s=create().sessions;
    const original=start(s).current;
    expect(s.prepare(ID,"Como funciona uma entrevista?",true,undefined,"typed")).toBeNull();
    expect(s.prepare(ID,"Eu estou ocupado",true,undefined,"typed")).toBeNull();
    expect(s.prepare(ID,"Não consigo estudar com barulho na minha casa",true,undefined,"typed")).toBeNull();
    expect(s.inspectForTest(ID)).toBe(original);
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(0);
  });
  it("a known distractor produces local feedback without SRS or persistence",()=>{
    const s=create().sessions;
    start(s,ID,"Quero praticar Hello");
    s.prepare(ID,"Olá",true,undefined,"typed")!.complete("Certo!");
    const p=s.prepare(ID,"Goodbye",true,undefined,"typed");
    expect(p).not.toBeNull();
    expect(p?.directive).toContain("closed_candidate_not_yet");
    const msg=p!.complete("Vamos tentar novamente.");
    expect(msg).toContain("Como você escreveria Olá em inglês?");
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(1);
    expect(s.inspectForTest(ID)?.cal.observations).toHaveLength(1);
    expect(s.inspectForTest(ID)).not.toHaveProperty("srs");
  });
  it("a spoken help request keeps catalogue evidence untouched",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    const before=structuredClone(s.inspectForTest(ID));
    const p=s.prepare(ID,"não sei",true,undefined,"asr_text");
    expect(p).not.toBeNull();
    p?.complete("Vamos recomeçar por partes.");
    expect(s.inspectForTest(ID)?.cal.observations).toEqual(before?.cal.observations);
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(0);
  });
  it("spoken pause and resume preserve catalogue evidence",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    const before=structuredClone(s.inspectForTest(ID));
    const p=s.prepare(ID,"quero parar",true,undefined,"asr_text");
    expect(p).not.toBeNull();
    p?.complete("Claro, vamos pausar.");
    expect(s.inspectForTest(ID)?.cal.status).toBe("paused");
    expect(s.inspectForTest(ID)?.cal.observations).toEqual(before?.cal.observations);
    const resumed=s.prepare(ID,"continuar",true,undefined,"asr_text");
    expect(resumed).not.toBeNull();
    resumed?.complete("Vamos continuar.");
    expect(s.inspectForTest(ID)?.cal.status).toBe("active");
    expect(s.inspectForTest(ID)?.cal.observations).toEqual(before?.cal.observations);
  });
  it("a learner can request help without being graded as wrong",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    s.prepare(ID,"Olá",true,undefined,"typed")!.complete("Boa!");
    const p=s.prepare(ID,"Não sei",true,undefined,"typed");
    expect(p).not.toBeNull();
    const answer=p!.complete("Vamos por partes.");
    expect(answer).toContain("Hello");
    expect(s.inspectForTest(ID)?.cal.phase).toBe("ENSINAR");
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(0);
  });
  it("can pause and resume without storing a failed answer",()=>{
    const s=create().sessions;start(s);
    const p=s.prepare(ID,"Quero parar",true,undefined,"typed")!;
    expect(p.complete("Tudo certo.")).toContain("continuar");
    expect(s.inspectForTest(ID)?.cal.status).toBe("paused");
    expect(s.prepare(ID,"Não sei",true,undefined,"typed")).toBeNull();
    const resumed=s.prepare(ID,"Continuar",true,undefined,"typed")!;
    resumed.complete("Vamos prosseguir.");
    expect(s.inspectForTest(ID)?.cal.status).toBe("active");
    expect(s.inspectForTest(ID)?.task?.delivered).toBe(true);
  });
  it("a different goal resets task and never carries wrong-answer counts",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    s.prepare(ID,"Olá",true,undefined,"typed")!.complete("Certo");
    s.prepare(ID,"Goodbye",true,undefined,"typed")!.complete("Ainda não");
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(1);
    const next=s.prepare(ID,"Quero aprender a me apresentar",true,undefined,"typed")!;
    next.complete("Tudo bem.");
    expect(s.inspectForTest(ID)?.selectedCompetencyId).toBe("identity.my-name");
    expect(s.inspectForTest(ID)?.cal.consecutiveErrors).toBe(0);
    expect(s.inspectForTest(ID)?.cal.observations).toHaveLength(0);
  });
  it("keeps different authenticated accounts completely separate",()=>{
    const s=create().sessions;
    start(s,ID,"Quero praticar Hello");
    start(s,ID+1,"Quero aprender a me apresentar");
    expect(s.inspectForTest(ID)?.selectedCompetencyId).toBe("greeting.hello");
    expect(s.inspectForTest(ID+1)?.selectedCompetencyId).toBe("identity.my-name");
    expect(s.inspectForTest(ID)?.sessionId).not.toBe(s.inspectForTest(ID+1)?.sessionId);
    expect(s.prepare(ID+1,"Olá",true,undefined,"typed")).toBeNull();
  });
  it("rejects stale async commits rather than overwriting the newer task",()=>{
    const s=create().sessions;start(s);
    const older=s.prepare(ID,"Quero praticar Hello",true,undefined,"typed")!;
    const newer=s.prepare(ID,"Quero aprender por favor",true,undefined,"typed")!;
    newer.complete("Vamos tentar");
    const after=s.inspectForTest(ID);
    const staleText=older.complete("Entendi");
    expect(staleText).toBe("Entendi");
    expect(staleText).not.toContain("Exemplo:");
    expect(s.inspectForTest(ID)).toBe(after);
    expect(after?.selectedCompetencyId).toBe("courtesy.please");
  });
  it("does not expose duplicate tasks when a preview is completed twice",()=>{
    const s=create().sessions;
    const p=s.prepare(ID,"Quero aprender a me apresentar",true,undefined,"typed")!;
    const first=p.complete("Boa!");
    expect(first).toContain("My name is Alex");
    expect(p.complete("Resposta atrasada")).toBe("Resposta atrasada");
    expect(s.inspectForTest(ID)?.task?.delivered).toBe(true);
  });
  it("a different-domain answer does not become a fake error",()=>{
    const s=create().sessions;
    start(s,ID,"Quero aprender a me apresentar");
    const before=s.inspectForTest(ID);
    expect(s.prepare(ID,"Olá",true,undefined,"typed")).toBeNull();
    expect(s.inspectForTest(ID)).toBe(before);
    expect(s.inspectForTest(ID)?.cal.observations).toHaveLength(0);
  });
  it("session expires after thirty minutes without changing the original DB memory",()=>{
    const c=create();start(c.sessions);
    c.skip(30*60_000+1);
    expect(c.sessions.inspectForTest(ID)).toBeNull();
    expect(c.sessions.hasSession(ID)).toBe(false);
  });
  it("keeps the canonical task complete even when the LLM response is long",()=>{
    const s=create().sessions;
    const p=s.prepare(ID,"Quero aprender a me apresentar",true,undefined,"typed")!;
    const txt=p.complete("Texto de apoio. ".repeat(300));
    expect(txt.length).toBeLessThanOrEqual(1200);
    expect(txt.endsWith("Escreva Meu nome é Alex em inglês (Alex é um personagem).")).toBe(false);
    expect(txt.endsWith("Na frase My name is Alex, que informação é apresentada?")).toBe(true);
    expect(s.inspectForTest(ID)?.task?.delivered).toBe(true);
  });
  it("cannot be confused into grading ASR text as pronunciation",()=>{
    const s=create().sessions;start(s,ID,"Quero praticar Hello");
    expect(s.prepare(ID,"Olá",true,undefined,"asr_text")).toBeNull();
    expect(s.inspectForTest(ID)?.cal.phase).toBe("ENSINAR");
  });
});
