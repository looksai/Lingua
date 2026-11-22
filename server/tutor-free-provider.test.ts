import {describe,it,expect,vi} from "vitest";
import {createGroqTutor,geminiTestSpeech,GEMINI_TEST_PHRASES} from "./tutor-free-provider";
import {freeTutorAllowed,paidTutorAllowed,geminiDemoAllowed,tutorMode} from "./tutor-budget";
import {appRouter} from "./routers";

describe("No-credit staging provider",()=>{
  const env={LINGUA_TUTOR_PROVIDER:"groq-gemini",LINGUA_TUTOR_ENABLED:"true",LINGUA_TUTOR_ALLOWED_EMAILS:"qa@example.com",GROQ_API_KEY:"groq-test",GEMINI_API_KEY:"gemini-test",OPENAI_API_KEY:"old-key"};
  it("does not authorize OpenAI when free mode is selected",()=>{
    expect(tutorMode({})).toBe("off");
    expect(freeTutorAllowed("qa@example.com",env)).toBe(true);
    expect(freeTutorAllowed("other@example.com",env)).toBe(false);
    expect(paidTutorAllowed("qa@example.com",env)).toBe(false);
    expect(geminiDemoAllowed("qa@example.com",env)).toBe(true);
    expect(freeTutorAllowed("qa@example.com",{...env,LINGUA_TUTOR_ENABLED:"false"})).toBe(false);
  });
  it("uses Groq endpoints and separate key for chat and transcriptions",async()=>{
    const req=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:"Let's practice welding."}}]}))).mockResolvedValueOnce(new Response(JSON.stringify({text:"I am a welder."})));
    const p=createGroqTutor(env,req);
    expect(await p.reply({tutorName:"Tutor",tutorPersona:"curious",interest:"work"},[],"Quero praticar solda.")).toBe("Let's practice welding.");
    expect(req.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.parse(String(req.mock.calls[0][1]?.body)).model).toBe("openai/gpt-oss-120b");
    expect((req.mock.calls[0][1]?.headers as Record<string,string>).Authorization).toBe("Bearer groq-test");
    expect(await p.transcribe(new Uint8Array([1,2,3]),"audio/webm")).toBe("I am a welder.");
    expect(req.mock.calls[1][0]).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect((req.mock.calls[1][1]?.body as FormData).get("model")).toBe("whisper-large-v3-turbo");
  });
  it("sends only a fixed fictional phrase to Gemini, returns WAV and never forwards history",async()=>{
    const wav=Buffer.alloc(48);wav.write("RIFF",0);wav.write("WAVE",8);
    const req=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({steps:[{type:"model_output",content:[{type:"audio",data:wav.toString("base64")}]}]})));
    const result=await geminiTestSpeech(1,env,req);
    expect(result).toEqual({text:GEMINI_TEST_PHRASES[1],audioBase64:wav.toString("base64"),audioMime:"audio/wav"});
    expect(req.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    const body=JSON.parse(String(req.mock.calls[0][1]?.body));
    expect(body.input[0].content[0].text).toBe(GEMINI_TEST_PHRASES[1]);
    expect(body.store).toBe(false);
    expect((req.mock.calls[0][1]?.headers as Record<string,string>)["x-goog-api-key"]).toBe("gemini-test");
    await expect(geminiTestSpeech(99,env,req)).rejects.toThrow("Gemini demo unavailable");
    expect(req).toHaveBeenCalledTimes(1);
  });
  it("does not retry or switch to a paid vendor on quota exhaustion",async()=>{
    const req=vi.fn<typeof fetch>().mockResolvedValue(new Response("private error",{status:429}));
    const p=createGroqTutor(env,req);
    await expect(p.reply({tutorName:"Tutor",tutorPersona:"neutral",interest:"work"},[],"test")).rejects.toThrow("provider rejected request");
    expect(req).toHaveBeenCalledTimes(1);
  });
  it("rejects anonymous Gemini audio calls",async()=>{
    const c=appRouter.createCaller({user:null,req:{} as never,res:{} as never});
    await expect(c.tutor.geminiDemo({consent:true,phraseIndex:1})).rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
});
