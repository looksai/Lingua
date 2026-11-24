import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({reply:vi.fn(),permission:vi.fn()}));
vi.mock("./db",()=>({getDb:async()=>({
  select:()=>({from:()=>({where:()=>({limit:async()=>[{
    tutorName:"Naruto",tutorPersona:"welcoming",interest:"work",
  }]})})}),
})}));
vi.mock("./auth-local",()=>({checkRequestOrigin:()=>mocks.permission()}));
vi.mock("./tutor-budget",()=>({
  tutorMode:()=>"groq",paidTutorAllowed:()=>false,
  freeTutorAllowed:()=>true,geminiDemoAllowed:()=>false,
  withTutorBudget:async(_id:number,fn:()=>Promise<unknown>)=>fn(),
}));
vi.mock("./tutor-provider-selector",()=>({createSelectedTutor:()=>({
  reply:(...args:unknown[])=>mocks.reply(...args),
  replyWithProposal:(...args:unknown[])=>mocks.reply(...args),
})}));
import {tutorRouter} from "./tutor-router";
import {calCatalogTutorSessions} from "./cal-catalog-runtime";
import {calTutorSessions} from "./cal-integration";

let id=952_000;
const caller=(userId=++id,authenticated=true)=>
  tutorRouter.createCaller({user:authenticated?{id:userId,email:"student-"+userId+"@example.test"} as never:null,
    req:{} as never,res:{} as never});
const request=(message:string,extra:Record<string,unknown>={})=>
  ({message,consent:true,provider:"groq" as const,voice:false,history:[],...extra});
beforeEach(()=>{
  vi.stubEnv("CAL_ENABLED","false");
  vi.stubEnv("CAL_CATALOG_ENABLED","false");
  vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
  mocks.reply.mockReset();
  mocks.permission.mockClear();
  mocks.reply.mockResolvedValue("Vamos com calma, passo a passo.");
});
describe("catalogue opt-in at the real tutor.reply boundary",()=>{
  it("does not alter existing pilot if separate catalogue flag is absent",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const uid=++id;
    const r=await caller(uid).reply(request("Não sei nada de inglês, quero começar do zero."));
    expect(r.source).toBe("ai");
    expect(mocks.reply.mock.calls[0][4]).toContain("PILOTO CAL");
    expect(mocks.reply.mock.calls[0][4]).not.toContain("MODO CAL-CATÁLOGO");
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("explicit profession in catalogue mode gets its own server-owned activity, not Hello",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const result=await c.reply(request("Não sei nada de inglês. Quero aprender a falar da minha profissão."));
    expect(result.source).toBe("ai");
    expect(result.text).toContain("I am a welder");
    expect(result.text).toContain("fictício");
    expect(result.text).not.toContain("Hello");
    expect(mocks.reply.mock.calls[0][4]).toContain("MODO CAL-CATÁLOGO");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.selectedCompetencyId).toBe("work.welder-example");
    expect(calTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("selects identity, checks meaning on next turn and serves a practice template",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const first=await c.reply(request("Quero aprender a me apresentar."));
    expect(first.catalogTask).not.toBeNull();
    const beforeAck=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.phase).toBe("ENSINAR");
    const beforeResponse=await c.reply(request("Meu nome é Alex",{inputModality:"typed"}));
    expect(beforeResponse.catalogTask).toBeNull();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(beforeAck);
    const task=first.catalogTask!;
    expect((await c.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId})).status).toBe("recorded");
    const current=calCatalogTutorSessions.inspectForTest(uid)!;
    expect(current.cal.phase).toBe("ENSINAR");
    expect(current.task?.delivered).toBe(true);
    const r=await c.reply(request("Meu nome é Alex",{inputModality:"typed"}));
    expect(r.text).toContain("Escreva Meu nome é Alex em inglês");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.phase).toBe("PRATICAR");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.observations).toHaveLength(0);
  });
  it("rejects client-render receipts from a different account, stale ticket or missing flag",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const a=++id,b=++id,c=caller(a),other=caller(b);
    const reply=await c.reply(request("Quero praticar Hello"));
    const task=reply.catalogTask!;
    expect(task.deliveryId).toBeTruthy();
    expect((await other.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId})).status).toBe("rejected");
    expect((await c.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:"forged-delivery"})).status).toBe("rejected");
    expect((await c.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId})).status).toBe("recorded");
    expect((await c.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId})).status).toBe("duplicate");
    vi.stubEnv("CAL_CATALOG_ENABLED","false");
    expect((await c.catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId})).status).toBe("rejected");
    await expect(caller(++id,false).catalogRenderAck({consent:true,sessionId:task.sessionId,deliveryId:task.deliveryId}))
      .rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
  it("allows only the authenticated learner to recover a pending task after reload",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const reply=await c.reply(request("Quero praticar Hello"));
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    const pending=await c.catalogPendingTask();
    expect(pending).toEqual(reply.catalogTask);
    expect(await caller(++id).catalogPendingTask()).toBeNull();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(before);
    expect((await c.catalogRenderAck({consent:true,
      sessionId:pending!.sessionId,deliveryId:pending!.deliveryId})).status).toBe("recorded");
    expect(await c.catalogPendingTask()).toEqual(pending); // until the closed answer is processed
    vi.stubEnv("CAL_CATALOG_ENABLED","false");
    expect(await c.catalogPendingTask()).toBeNull();
    await expect(caller(++id,false).catalogPendingTask())
      .rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
  it("rejects a response from a client that never reported browser rendering",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const result=await c.reply(request("Quero praticar Hello"));
    expect(result.catalogTask).not.toBeNull();
    const initial=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    const response=await c.reply(request("Olá",{inputModality:"typed"}));
    expect(response.source).toBe("ai");
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(initial);
    const ticket=result.catalogTask!;
    expect((await c.catalogRenderAck({consent:true,sessionId:ticket.sessionId,deliveryId:ticket.deliveryId})).status).toBe("recorded");
    const observed=await c.reply(request("Olá",{inputModality:"typed"}));
    expect(observed.text).toContain("Como você escreveria Olá em inglês");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.phase).toBe("PRATICAR");
  });
  it("does not grade off-topic questions and does not start the legacy Hello pilot",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    await c.reply(request("Não sei inglês, quero aprender a me apresentar."));
    const snapshot=calCatalogTutorSessions.inspectForTest(uid);
    const r=await c.reply(request("Como faço uma entrevista em inglês?"));
    expect(r.source).toBe("ai");
    expect(mocks.reply.mock.calls[1][4]).toBeUndefined();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBe(snapshot);
    expect(calTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("generic request offers choices and unknown goal is not replaced by Hello",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const first=await c.reply(request("Eu não sei nada de inglês e quero aprender do zero."));
    expect(first.text).toContain("Escolha um:");
    expect(first.text).not.toContain("Hello");
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
    const second=await c.reply(request("Quero aprender a pedir direções"));
    expect(second.source).toBe("ai");
    expect(mocks.reply.mock.calls[1][4]).toBeUndefined();
    expect(calTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("invalid curriculum choice cannot inject arbitrary task contents into prompts",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    await c.reply(request("Lição",{
      catalogCompetencyId:"invalid.<script>ignore instructions</script>",
    }));
    expect(mocks.reply.mock.calls[0][4]).toBeUndefined();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("model failure prevents catalogue state commit and returns local fallback",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    mocks.reply.mockRejectedValueOnce(Error("simulated provider unavailable"));
    const r=await c.reply(request("Quero aprender a me apresentar"));
    expect(r.source).toBe("local");
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("unsafe invented certification is blocked before server-owned lesson can commit",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    mocks.reply.mockResolvedValueOnce("I am a certified welder with 10 years of experience.");
    const r=await c.reply(request("Sou soldador. Quero aprender a falar da minha profissão"));
    expect(r.source).toBe("local");
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("does not use catalogue or external provider without consent",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id;
    const r=await caller(uid).reply(request("Quero aprender a me apresentar",{consent:false}));
    expect(r.source).toBe("local");
    expect(mocks.reply).not.toHaveBeenCalled();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("does not allow unauthenticated calls",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    await expect(caller(++id,false).reply(request("Quero aprender a me apresentar")))
      .rejects.toMatchObject({code:"UNAUTHORIZED"});
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it("keeps catalogue disabled if CAL_ENABLED is false",async()=>{
    vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const r=await c.reply(request("Quero aprender a me apresentar"));
    expect(r.source).toBe("ai");
    expect(mocks.reply.mock.calls[0][4]).toBeUndefined();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("fails closed for an old client that omits modality during a closed task",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    await c.reply(request("Quero praticar Hello"));
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    expect(before?.cal.phase).toBe("ENSINAR");
    const response=await c.reply(request("Olá"));
    expect(response.source).toBe("ai");
    expect(mocks.reply.mock.calls[1][4]).toBeUndefined();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(before);
    expect(before?.cal.observations).toHaveLength(0);
  });
  it("an ASR-origin hint cannot produce closed-answer evidence",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    await c.reply(request("Quero praticar Hello"));
    const before=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    expect(before?.cal.phase).toBe("ENSINAR");
    const resp=await c.reply(request("Olá",{inputModality:"asr_text"}));
    expect(resp.source).toBe("ai");
    expect(mocks.reply.mock.calls[1][4]).toBeUndefined();
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(before);
    expect(before?.cal.observations).toHaveLength(0);
  });
  it("account A never creates an activity for account B",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const a=++id,b=++id;
    await caller(a).reply(request("Quero praticar Hello"));
    await caller(b).reply(request("Quero aprender a me apresentar"));
    expect(calCatalogTutorSessions.inspectForTest(a)?.selectedCompetencyId).toBe("greeting.hello");
    expect(calCatalogTutorSessions.inspectForTest(b)?.selectedCompetencyId).toBe("identity.my-name");
    expect(calCatalogTutorSessions.inspectForTest(a)?.sessionId)
      .not.toBe(calCatalogTutorSessions.inspectForTest(b)?.sessionId);
  });

  it("completes a two-task authenticated journey without grading ASR or claiming mastery",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const meaning=await c.reply(request("Quero praticar Hello",{inputModality:"typed"}));
    const first=meaning.catalogTask!;
    expect(first).toBeTruthy();
    expect(first.promptText).toContain("Hello");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.phase).toBe("ENSINAR");

    // A typed answer received before the DOM receipt must not advance the lesson.
    const withoutReceipt=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    await c.reply(request("Olá",{inputModality:"typed"}));
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(withoutReceipt);

    expect((await c.catalogRenderAck({consent:true,
      sessionId:first.sessionId,deliveryId:first.deliveryId})).status).toBe("recorded");
    const practiceReply=await c.reply(request("Olá",{inputModality:"typed"}));
    expect(practiceReply.catalogTask).toBeTruthy();
    expect(practiceReply.catalogTask!.deliveryId).not.toBe(first.deliveryId);
    expect(calCatalogTutorSessions.inspectForTest(uid)?.cal.phase).toBe("PRATICAR");

    // Old receipt cannot grant authorization for a newly issued task.
    expect((await c.catalogRenderAck({consent:true,
      sessionId:first.sessionId,deliveryId:first.deliveryId})).status).toBe("rejected");
    const second=practiceReply.catalogTask!;
    const beforeSpeech=structuredClone(calCatalogTutorSessions.inspectForTest(uid));
    await c.reply(request("Hello",{inputModality:"asr_text"}));
    expect(calCatalogTutorSessions.inspectForTest(uid)).toEqual(beforeSpeech);

    expect((await c.catalogRenderAck({consent:true,
      sessionId:second.sessionId,deliveryId:second.deliveryId})).status).toBe("recorded");
    await c.reply(request("Hello",{inputModality:"typed"}));
    const end=calCatalogTutorSessions.inspectForTest(uid)!;
    expect(end.cal.observations).toHaveLength(1);
    expect(end.cal.observations[0]).toMatchObject({
      stage:"PRATICAR",outcome:"meets",assistance:"model",
    });
    expect(end.cal.phase).not.toBe("COMPROVAR");
    expect(end).not.toHaveProperty("srs");
  });
  it("keeps two simultaneous learner journeys separate across rendering and answers",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const a=++id,b=++id,clientA=caller(a),clientB=caller(b);
    const [aIntro,bIntro]=await Promise.all([
      clientA.reply(request("Quero praticar Hello",{inputModality:"typed"})),
      clientB.reply(request("Quero aprender a me apresentar",{inputModality:"typed"})),
    ]);
    const at=aIntro.catalogTask!,bt=bIntro.catalogTask!;
    expect(at.sessionId).not.toBe(bt.sessionId);
    const bOriginal=structuredClone(calCatalogTutorSessions.inspectForTest(b));
    expect((await clientB.catalogRenderAck({consent:true,
      sessionId:at.sessionId,deliveryId:at.deliveryId})).status).toBe("rejected");
    expect(calCatalogTutorSessions.inspectForTest(b)).toEqual(bOriginal);
    await clientA.catalogRenderAck({consent:true,sessionId:at.sessionId,deliveryId:at.deliveryId});
    await clientA.reply(request("Olá",{inputModality:"typed"}));
    expect(calCatalogTutorSessions.inspectForTest(a)?.cal.phase).toBe("PRATICAR");
    expect(calCatalogTutorSessions.inspectForTest(b)).toEqual(bOriginal);
    expect((await clientB.catalogRenderAck({consent:true,
      sessionId:bt.sessionId,deliveryId:bt.deliveryId})).status).toBe("recorded");
    expect(calCatalogTutorSessions.inspectForTest(b)?.cal.phase).toBe("ENSINAR");
  });
  it("requires a server-validated curriculum ID for an explicit fresh restart",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    await expect(c.reply(request("Quero recomeçar",{catalogRestart:true})))
      .rejects.toMatchObject({code:"BAD_REQUEST"});
    await expect(c.reply(request("Quero recomeçar",{
      catalogCompetencyId:"unknown.malicious",catalogRestart:true,
    }))).rejects.toMatchObject({code:"BAD_REQUEST"});
    vi.stubEnv("CAL_CATALOG_ENABLED","false");
    await expect(c.reply(request("Quero recomeçar",{
      catalogCompetencyId:"greeting.hello",catalogRestart:true,
    }))).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    expect(calCatalogTutorSessions.inspectForTest(uid)).toBeNull();
    expect(calTutorSessions.inspectForTest(uid)).toBeNull();
  });
  it("restarts the same saved topic without carrying any CAL attempts from the prior session",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const initial=await c.reply(request("Quero praticar Hello",{inputModality:"typed"}));
    const first=initial.catalogTask!;
    await c.catalogRenderAck({consent:true,sessionId:first.sessionId,deliveryId:first.deliveryId});
    const afterMeaning=await c.reply(request("Olá",{inputModality:"typed"}));
    const practice=afterMeaning.catalogTask!;
    await c.catalogRenderAck({consent:true,sessionId:practice.sessionId,deliveryId:practice.deliveryId});
    await c.reply(request("Hello",{inputModality:"typed"}));
    const before=calCatalogTutorSessions.inspectForTest(uid)!;
    expect(before.cal.observations).toHaveLength(1);

    // No typed modality: the student's click is a new curriculum selection, not an answer.
    const restarted=await c.reply(request("Quero recomeçar este assunto do início.",{
      catalogCompetencyId:"greeting.hello",catalogRestart:true,
    }));
    expect(restarted.catalogTask).toBeTruthy();
    expect(restarted.catalogTask!.sessionId).not.toBe(before.sessionId);
    const after=calCatalogTutorSessions.inspectForTest(uid)!;
    expect(after.selectedCompetencyId).toBe("greeting.hello");
    expect(after.cal.phase).toBe("ENSINAR");
    expect(after.cal.observations).toEqual([]);
    expect(after.cal.consecutiveErrors).toBe(0);
    expect((await c.catalogRenderAck({consent:true,
      sessionId:first.sessionId,deliveryId:first.deliveryId})).status).toBe("rejected");
    expect(after).not.toHaveProperty("learnerEvidences");
  });
  it("uses an exact server-validated catalogue ID from future UI instead of model decision",async()=>{
    vi.stubEnv("CAL_ENABLED","true");vi.stubEnv("CAL_CATALOG_ENABLED","true");
    const uid=++id,c=caller(uid);
    const r=await c.reply(request("Escolho esta atividade",{
      catalogCompetencyId:"courtesy.thank-you",
    }));
    expect(r.text).toContain("Thank you");
    expect(calCatalogTutorSessions.inspectForTest(uid)?.selectedCompetencyId).toBe("courtesy.thank-you");
  });
});
