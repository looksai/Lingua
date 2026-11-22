import {describe,it,expect,vi} from "vitest";
import {PLACEMENT_TASKS,starterPlan,learnerPlan} from "../shared/placement";
import {proposeFourWeekPlan} from "./placement-generator";
import {appRouter} from "./routers";

const samples=PLACEMENT_TASKS.map(t=>({taskId:t.id,prompt:t.prompt,answer:"I work as a welder.",modality:"text" as const}));
const valid=starterPlan("work");
describe("Provisional placement — no made-up CEFR",()=>{
  it("has three bounded writing samples and does not classify other skills",()=>{
    expect(PLACEMENT_TASKS).toHaveLength(3);
    expect(PLACEMENT_TASKS.every(t=>t.domain==="writing")).toBe(true);
    expect(learnerPlan.safeParse(valid).success).toBe(true);
    expect(JSON.stringify(valid)).not.toMatch(/\b(A1|A2|B1|B2|C1|C2|CEFR)\b/);
  });
  it("sends three distinct task and answer pairs exclusively to Groq, validates four weeks",async()=>{
    const req=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(valid)}}]})));
    const result=await proposeFourWeekPlan(samples,"work",{GROQ_API_KEY:"groq-only",LINGUA_TUTOR_PROVIDER:"groq-gemini"},req);
    expect(result.source).toBe("groq_suggestion");
    expect(result.plan.weeks).toHaveLength(4);
    expect(String(req.mock.calls[0][0])).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body=JSON.parse(String(req.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toContain("I work as a welder.");
    expect(body.response_format).toEqual({type:"json_object"});
    expect(JSON.stringify(req.mock.calls)).not.toContain("api.openai.com");
    expect(req).toHaveBeenCalledTimes(1);
  });
  it("rejects hallucinated CEFR and malformed plans as fallback, not evidence",async()=>{
    const graded={...valid,title:"Aluno B2 certificado em inglês"};
    const req=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(graded)}}]})));
    const result=await proposeFourWeekPlan(samples,"work",{GROQ_API_KEY:"test",LINGUA_TUTOR_PROVIDER:"groq-gemini"},req);
    expect(result.source).toBe("rule_based");
    expect(result.plan.title).toContain("sujeito a revisão");
  });
  it.each([401,403,429,500])("returns deterministic fallback on HTTP %i without retry",async status=>{
    const log=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response("secret",{status}));
    try{
      const result=await proposeFourWeekPlan(samples,"work",{GROQ_API_KEY:"secret-token",LINGUA_TUTOR_PROVIDER:"groq-gemini"},request);
      expect(result.source).toBe("rule_based");
      expect(request).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token");
    }finally{log.mockRestore();}
  });
  it("never calls any vendor with disabled or missing Groq key",async()=>{
    const request=vi.fn<typeof fetch>();
    expect((await proposeFourWeekPlan(samples,"work",{LINGUA_TUTOR_PROVIDER:"off",OPENAI_API_KEY:"sk-private"},request)).source).toBe("rule_based");
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects anonymous learner placement reads and writes",async()=>{
    const caller=appRouter.createCaller({user:null,req:{} as never,res:{} as never});
    await expect(caller.placement.me()).rejects.toMatchObject({code:"UNAUTHORIZED"});
    await expect(caller.placement.submit({taskId:"introduce-v1",answer:"Hello",consent:true,modality:"text"})).rejects.toMatchObject({code:"UNAUTHORIZED"});
    await expect(caller.placement.generate({consent:true})).rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
});
