import { describe, expect, it, vi } from "vitest";
import { createGroqTutor } from "../server/tutor-free-provider";
import { createOpenAITutor } from "../server/tutor-provider";
import { enforceBeginnerPortuguese, isEnglishDominantReply, needsAbsoluteBeginnerSupport } from "./tutor-language";
import { systemInstructions, type TutorHistory, type TutorProfile } from "./tutor";

const profile: TutorProfile = {tutorName:"Naruto Uzumaki",tutorPersona:"curious",interest:"work"};
const history: TutorHistory[] = [
  {role:"user",text:"Naruto, eu sou soldador, mas não sei nada de inglês."},
  {role:"assistant",text:"Vamos começar do zero."},
];
const english = "Great! You can say: I work as a welder. Ready to practice?";

describe("Absolute beginner learner support P0",()=>{
  it("recognizes explicit lack of English from the current student or earlier student turn",()=>{
    expect(needsAbsoluteBeginnerSupport([],"desculpe Naruto, não sei nada de inglês ainda")).toBe(true);
    expect(needsAbsoluteBeginnerSupport(history,"Me ajuda a falar devagar?")).toBe(true);
    expect(needsAbsoluteBeginnerSupport([],"Eu sou iniciante absoluto.")).toBe(true);
    expect(needsAbsoluteBeginnerSupport([],"quero começar do zero")).toBe(true);
    expect(needsAbsoluteBeginnerSupport([],"Eu trabalho como soldador")).toBe(false);
    expect(needsAbsoluteBeginnerSupport([], "Me ajude",["Eu não entendo inglês."])).toBe(true);
  });
  it("does not infer proficiency from the assistant and respects a new explicit English-only request",()=>{
    expect(needsAbsoluteBeginnerSupport([{role:"assistant",text:"Eu não sei nada de inglês."}],"Oi")).toBe(false);
    expect(needsAbsoluteBeginnerSupport(history,"Responda só em inglês.")).toBe(false);
  });
  it("catches real English-dominant answer despite the model's Portuguese prompt",()=>{
    expect(isEnglishDominantReply(english)).toBe(true);
    expect(isEnglishDominantReply("You work as a welder. Try saying: I work as a welder.")).toBe(true);
    expect(isEnglishDominantReply("Entendi! Em inglês, I am a welder significa Eu sou soldador. Quer repetir devagar?")).toBe(false);
  });
  it("replaces an inaccessible response with one short translated example and Portuguese question",()=>{
    const result=enforceBeginnerPortuguese(english,history,"Desculpe, ainda não entendo nada de inglês.");
    expect(result.corrected).toBe(true);
    expect(result.text).toContain("português");
    expect(result.text).toContain("I am a welder");
    expect(result.text).toContain("Eu sou soldador");
    expect(result.text).toContain("Quer");
    expect(result.text).not.toContain("Ready to practice");
    expect(result.text).not.toMatch(/certified|years of experience/i);
  });
  it("uses student-supplied job facts, never the assistant's invented qualifications",()=>{
    const result=enforceBeginnerPortuguese("You work as a welder. Try saying: I work as a welder.",history,"Naruto, eu trabalho com o que mesmo?");
    expect(result.corrected).toBe(true);
    expect(result.text).toContain("Você me contou que trabalha como soldador");
    const invented: TutorHistory[]=[{role:"assistant",text:"I am a certified welder with 5 years of experience."}];
    const unknown=enforceBeginnerPortuguese(english,invented,"Não sei nada de inglês.");
    expect(unknown.text).not.toContain("soldador");
    expect(unknown.text).not.toContain("certificação");
  });
  it("does not overwrite a suitable Portuguese reply or other learner levels",()=>{
    const good="Vamos com calma. I am a welder significa Eu sou soldador. Quer repetir?";
    expect(enforceBeginnerPortuguese(good,history,"Não entendo inglês.")).toEqual({text:good,corrected:false});
    expect(enforceBeginnerPortuguese(english,[],"Você pode me ajudar?")).toEqual({text:english,corrected:false});
  });
  it("sends strong pedagogical instructions through both Groq and OpenAI without extra API calls",async()=>{
    const modelAnswer=JSON.stringify({resposta:"Entendi! Hello significa Olá. Quer praticar?",memoria:null});
    const groq=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({choices:[{message:{content:modelAnswer}}]}))
    );
    const g=createGroqTutor({GROQ_API_KEY:"fake"},groq);
    const reply=await g.replyWithProposal(profile,history,"Me ajuda?",[]);
    expect(reply.text).toContain("Entendi");
    const body=JSON.parse(String(groq.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("INICIANTE ABSOLUTO");
    expect(body.messages[0].content).toContain("UMA palavra ou microfrase");
    expect(body.messages[0].content).toContain("português");
    expect(groq).toHaveBeenCalledOnce();

    const openai=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({choices:[{message:{content:"Tudo bem. Vamos aprender juntos."}}]}))
    );
    await createOpenAITutor({OPENAI_API_KEY:"fake"},openai).reply(profile,history,"Vamos devagar.");
    const o=JSON.parse(String(openai.mock.calls[0][1]?.body));
    expect(o.messages[0].content).toContain("INICIANTE ABSOLUTO");
    expect(openai).toHaveBeenCalledOnce();
  });
  it("keeps the normal tutor prompt intact when beginner support is not needed",()=>{
    expect(systemInstructions(profile,[],false,false)).toContain("português");
    expect(systemInstructions(profile,[],false,false)).not.toContain("SINAL FORTE DE INICIANTE ABSOLUTO");
  });
});
