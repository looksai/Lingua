import {describe,it,expect,vi} from "vitest";
import {guardTutorLearnerClaims} from "./tutor-fact-guard";
import {systemInstructions,type TutorHistory,type TutorProfile} from "../shared/tutor";
import {createGroqTutor} from "./tutor-free-provider";

const profile:TutorProfile={tutorName:"Naruto Uzumaki",tutorPersona:"curious",interest:"work"};
const student: TutorHistory[]=[
  {role:"user",text:"Vou tentar trabalhar no Canadá. Sou soldador, mas não sei inglês."},
  {role:"assistant",text:"Que interessante! Vamos aprender a falar em inglês."}
];

describe("P0: do not invent learner qualifications",()=>{
  it("rejects the exact field-reported hallucination without claiming credentials",()=>{
    const candidate="Entendo! Vamos usar esta frase: **I am a certified welder with 5 years of experience.** Como você se apresentaria?";
    const result=guardTutorLearnerClaims(candidate,student,"Quero praticar uma entrevista.");
    expect(result.blocked).toBe(true);
    expect(result.text).toContain("I work in [your field]");
    expect(result.text).not.toContain("certified welder");
    expect(result.text).not.toContain("5 years");
  });
  it("never treats prior assistant replies as evidence about the student",()=>{
    const history:TutorHistory[]=[
      {role:"user",text:"Sou soldador e quero aprender inglês."},
      {role:"assistant",text:"I am a certified welder with 5 years of experience."}
    ];
    expect(guardTutorLearnerClaims("You can say: I am a certified welder.",history,"Pode me ajudar?").blocked).toBe(true);
  });
  it("allows confirmed credentials and exact years only when stated by the learner",()=>{
    const history:TutorHistory[]=[{role:"user",text:"Sou um soldador certificado e tenho 8 anos de experiência."}];
    const correct="You can say: I am a certified welder with 8 years of experience.";
    expect(guardTutorLearnerClaims(correct,history,"Como me apresento?")).toEqual({text:correct,blocked:false});
    expect(guardTutorLearnerClaims("I am a certified welder with 5 years of experience.",history,"Como me apresento?").blocked).toBe(true);
  });
  it("rejects unverified certification even when the student disclosed tenure",()=>{
    const h:TutorHistory[]=[{role:"user",text:"Tenho 5 anos de experiência como soldador."}];
    expect(guardTutorLearnerClaims("I am a certified welder with 5 years of experience.",h,"Me ajude.").blocked).toBe(true);
  });
  it("does not remove a natural response without unsupported qualifications",()=>{
    const safe="Você pode dizer: **I work as a welder.** (Eu trabalho como soldador.) Quer praticar uma apresentação?";
    expect(guardTutorLearnerClaims(safe,student,"Praticar").text).toBe(safe);
    expect(guardTutorLearnerClaims(safe,student,"Praticar").blocked).toBe(false);
  });
  it("adds an explicit factual-data rule to both tutor providers' system prompt",async()=>{
    const prompt=systemInstructions(profile);
    for(const concept of ["Nunca invente fatos","onboarding","certificação","anos de experiência","[your profession]","Respostas anteriores do tutor nunca constituem evidência"]){
      expect(prompt).toContain(concept);
    }
    const request=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({choices:[{message:{content:"I work as a welder."}}]})));
    const adapter=createGroqTutor({GROQ_API_KEY:"fake-test-key"},request);
    await adapter.reply(profile,[],"Sou soldador.");
    const wire=JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(wire.messages[0].role).toBe("system");
    expect(wire.messages[0].content).toContain("Nunca invente fatos");
    expect(wire.messages.at(-1)).toEqual({role:"user",content:"Sou soldador."});
    expect(request).toHaveBeenCalledOnce();
  });
});
