import {describe,it,expect,vi} from "vitest";
import {createGroqTutor,geminiTestSpeech,GEMINI_TEST_PHRASES,GroqRateLimitError,GROQ_RATE_LIMIT_MESSAGE} from "./tutor-free-provider";
import {createSelectedTutor} from "./tutor-provider-selector";
import {tutorFailureReply} from "./tutor-fallback";
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
    await expect(p.reply({tutorName:"Tutor",tutorPersona:"neutral",interest:"work"},[],"test")).rejects.toThrow(GroqRateLimitError);
    expect(req).toHaveBeenCalledTimes(1);
  });
  it("free mode never selects or calls OpenAI even when an OpenAI key exists",async()=>{
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:"I can help you learn."}}]})));
    const forbidden={...env,OPENAI_API_KEY:"sk-must-not-be-used"};
    expect(()=>createSelectedTutor("openai",forbidden,request)).toThrow("tutor provider disabled");
    const adapter=createSelectedTutor("groq",forbidden,request);
    expect(await adapter.reply({tutorName:"Tutor",tutorPersona:"curious",interest:"work"},[],"Help me")).toBe("I can help you learn.");
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.stringify(request.mock.calls)).not.toContain("sk-must-not-be-used");
    expect(JSON.stringify(request.mock.calls)).not.toContain("api.openai.com");
  });
  it.each([401,403,429,500])("handles Groq HTTP %i without a key leak and returns a safe fallback",async(status)=>{
    const secret="sk-test-never-log-phrase";
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({error:{message:secret,code:"dangerous_private_error"}}),{status}));
    try {
      const adapter=createSelectedTutor("groq",{...env,OPENAI_API_KEY:secret},request);
      const error=await adapter.reply({tutorName:"Tutor",tutorPersona:"neutral",interest:"work"},[],"I work with TIG welding.").then(()=>null,e=>e);
      expect(error).toBeInstanceOf(Error);
      if(status===429)expect(error).toBeInstanceOf(GroqRateLimitError);
      else expect(error).toMatchObject({message:"provider rejected request"});
      const fallback=tutorFailureReply(error,"I work with TIG welding.",false);
      expect(fallback.source).toBe("local");
      if(status===429)expect(fallback.text).toBe(GROQ_RATE_LIMIT_MESSAGE);
      else expect(fallback.text).toContain("indisponível");
      expect(warn).toHaveBeenCalledWith("[tutor-free] provider=groq-chat status="+status);
      expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(fallback)).not.toContain(secret);
      expect(JSON.stringify(request.mock.calls)).not.toContain("api.openai.com");
      expect(request).toHaveBeenCalledTimes(1);
    }finally {warn.mockRestore();}
  });
  it("handles Groq timeout without retry, vendor fallback or secret logging",async()=>{
    vi.useFakeTimers();
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockImplementation((_url,options)=>new Promise((_resolve,reject)=>{
      options?.signal?.addEventListener("abort",()=>reject(new Error("mock aborted")),{once:true});
    }));
    try{
      const adapter=createSelectedTutor("groq",{...env,OPENAI_API_KEY:"sk-no-use"},request);
      const settled=adapter.reply({tutorName:"Tutor",tutorPersona:"neutral",interest:"work"},[],"practice").then(()=>null,e=>e);
      await vi.advanceTimersByTimeAsync(25_100);
      const error=await settled;
      expect(error).toBeInstanceOf(Error);
      expect(tutorFailureReply(error,"practice",false).source).toBe("local");
      expect(warn).toHaveBeenCalledWith("[tutor-free] provider=groq-chat timeout");
      expect(request).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(warn.mock.calls)).not.toContain("sk-no-use");
    }finally {warn.mockRestore();vi.useRealTimers();}
  });
  it("isolates Gemini fixed prompt from any learner profile or history",async()=>{
    const wav=Buffer.alloc(48);wav.write("RIFF",0);wav.write("WAVE",8);
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({steps:[{type:"model_output",content:[{type:"audio",data:wav.toString("base64")}]}]})));
    const secret="private-learner-name@secret.local";
    const response=await geminiTestSpeech(0,{...env,LINGUA_TUTOR_ALLOWED_EMAILS:secret},request);
    const serialized=String(request.mock.calls[0][1]?.body);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("history");
    expect(serialized).not.toContain("tutorName");
    expect(serialized).not.toContain("studentId");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(response.audioMime).toBe("audio/wav");
    expect(Buffer.from(response.audioBase64,"base64").subarray(0,4).toString()).toBe("RIFF");
  });
  it("rejects anonymous Gemini audio calls",async()=>{
    const c=appRouter.createCaller({user:null,req:{} as never,res:{} as never});
    await expect(c.tutor.geminiDemo({consent:true,phraseIndex:1})).rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
});
