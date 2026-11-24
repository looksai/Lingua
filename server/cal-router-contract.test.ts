import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  modelReply: vi.fn(),
  createAdapter: vi.fn(),
  permission: vi.fn(),
  queryCount: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            mocks.queryCount();
            return [{tutorName:"Naruto",tutorPersona:"welcoming",interest:"work"}];
          },
        }),
      }),
    }),
  }),
}));
vi.mock("./auth-local", () => ({checkRequestOrigin: () => mocks.permission()}));
vi.mock("./tutor-budget", () => ({
  tutorMode: () => "groq",
  paidTutorAllowed: () => false,
  freeTutorAllowed: () => true,
  geminiDemoAllowed: () => false,
  withTutorBudget: async (_id:number,fn:()=>Promise<unknown>) => fn(),
}));
vi.mock("./tutor-provider-selector", () => ({
  createSelectedTutor: (...args:unknown[]) => {
    mocks.createAdapter(...args);
    return {
      reply: (...values:unknown[]) => mocks.modelReply(...values),
      replyWithProposal: (...values:unknown[]) => mocks.modelReply(...values),
    };
  },
}));

import { tutorRouter } from "./tutor-router";
import { calTutorSessions } from "./cal-integration";

let userId=910_000;
const caller = (id = ++userId, authenticated = true) =>
  tutorRouter.createCaller({
    user: authenticated ? {id,email:`student-${id}@example.test`} as never : null,
    req: {} as never, res: {} as never,
  });
const input = (message:string, consent=true) =>
  ({message,history:[],consent,voice:false,provider:"groq" as const});
const teachText="Entendi! **Hello** significa **Olá**. O que significa Hello em português?";
const practiceText="Muito bem. Como você cumprimentaria alguém em inglês?";

beforeEach(()=>{
  vi.stubEnv("CAL_ENABLED","false");
  vi.stubEnv("CAL_CATALOG_ENABLED","false");
  vi.stubEnv("LINGUA_TUTOR_MEMORY_ENABLED","false");
  mocks.modelReply.mockReset();
  mocks.createAdapter.mockClear();
  mocks.permission.mockClear();
  mocks.queryCount.mockClear();
  mocks.modelReply.mockResolvedValue(teachText);
});

describe("CAL backend router regression — fake provider, no HTTP/DB writes",()=>{
  it("when flag is disabled, default model receives no CAL directive and no state is created",async()=>{
    const id=++userId, c=caller(id);
    const r=await c.reply(input("Eu não sei inglês. Quero começar do zero."));
    expect(r.source).toBe("ai");
    expect(mocks.modelReply).toHaveBeenCalledOnce();
    expect(mocks.modelReply.mock.calls[0][4]).toBeUndefined();
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("CAL_ENABLED true creates a teaching directive inside the authorized tRPC flow",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    const r=await c.reply(input("Não sei nada de inglês, quero começar do zero."));
    expect(r.source).toBe("ai");
    expect(r.text).toContain("Hello");
    expect(mocks.modelReply.mock.calls[0][4]).toContain("Estado atual: ENSINAR");
    expect(calTutorSessions.inspectForTest(id)?.snapshot.phase).toBe("ENSINAR");
    expect(calTutorSessions.inspectForTest(id)?.pending).toBe("meaning");
    expect(mocks.createAdapter).toHaveBeenCalledOnce();
  });
  it("the learner's answer is graded on the next turn, not the model's reply",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    await c.reply(input("Não sei nada de inglês, quero aprender."));
    mocks.modelReply.mockResolvedValueOnce(practiceText);
    const second=await c.reply(input("Olá"));
    expect(second.source).toBe("ai");
    expect(mocks.modelReply.mock.calls[1][4]).toContain("Estado atual: PRATICAR");
    expect(calTutorSessions.inspectForTest(id)?.pending).toBe("english");
    expect(calTutorSessions.inspectForTest(id)?.snapshot.observations).toHaveLength(0);
    await c.reply(input("Hello"));
    const obs=calTutorSessions.inspectForTest(id)?.snapshot.observations;
    expect(obs).toHaveLength(1);
    expect(obs?.[0].outcome).toBe("meets");
    expect(obs?.[0].assistance).toBe("model");
  });
  it("explicit AI refusal/denied consent never invokes CAL or the provider",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    const res=await c.reply(input("Não sei inglês, quero estudar.",false));
    expect(res.source).toBe("local");
    expect(mocks.createAdapter).not.toHaveBeenCalled();
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("unauthenticated call is rejected before profile and CAL",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id,false);
    await expect(c.reply(input("Não sei nada de inglês."))).rejects.toMatchObject({code:"UNAUTHORIZED"});
    expect(mocks.queryCount).not.toHaveBeenCalled();
    expect(mocks.createAdapter).not.toHaveBeenCalled();
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("failed external model request does not commit a learner state or observation",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    mocks.modelReply.mockRejectedValueOnce(Error("offline mock"));
    const res=await c.reply(input("Não sei nada de inglês, quero começar do zero."));
    expect(res.source).toBe("local");
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("a factually unsafe model reply is replaced before CAL can commit",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    mocks.modelReply.mockResolvedValueOnce("I am a certified welder with 5 years of experience.");
    const r=await c.reply(input("Eu sou soldador. Não sei nada de inglês e quero aprender."));
    expect(r.source).toBe("local");
    expect(r.text).not.toContain("certified welder");
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("generic English questions by non-beginners cannot hijack objective with Hello",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    await c.reply(input("Quero aprender inglês para uma entrevista de trabalho."));
    expect(mocks.modelReply.mock.calls[0][4]).toBeUndefined();
    expect(calTutorSessions.inspectForTest(id)).toBeNull();
  });
  it("an off-topic question during the exercise bypasses CAL without grading",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    await c.reply(input("Não sei nada de inglês. Quero começar do zero."));
    mocks.modelReply.mockResolvedValueOnce("Você pode dizer: I am a welder = Eu sou soldador.");
    await c.reply(input("Como se diz soldador em inglês?"));
    expect(mocks.modelReply.mock.calls[1][4]).toBeUndefined();
    expect(calTutorSessions.inspectForTest(id)?.snapshot.observations).toHaveLength(0);
  });
  it("one authenticated account cannot receive another account's CAL session",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const a=++userId,b=++userId;
    await caller(a).reply(input("Eu não sei nada de inglês. Quero estudar."));
    await caller(b).reply(input("Eu não sei nada de inglês. Quero estudar."));
    expect(calTutorSessions.inspectForTest(a)?.snapshot.sessionId)
      .not.toBe(calTutorSessions.inspectForTest(b)?.snapshot.sessionId);
    expect(calTutorSessions.inspectForTest(a)?.snapshot.observations).toHaveLength(0);
    expect(calTutorSessions.inspectForTest(b)?.snapshot.observations).toHaveLength(0);
  });
  it("a response without the expected question is not treated as a tested task",async()=>{
    vi.stubEnv("CAL_ENABLED","true");
    const id=++userId,c=caller(id);
    mocks.modelReply.mockResolvedValueOnce("Hello é Olá, quer conversar?");
    await c.reply(input("Não sei nada de inglês. Quero começar."));
    expect(calTutorSessions.inspectForTest(id)?.pending).toBeNull();
    await c.reply(input("Olá"));
    expect(calTutorSessions.inspectForTest(id)?.snapshot.phase).toBe("ENSINAR");
  });
});
