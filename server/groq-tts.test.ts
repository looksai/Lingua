import {describe,it,expect,vi} from "vitest";
import {synthesizeEnglish,GROQ_ENGLISH_VOICES,GroqTtsBadRequest} from "./groq-tts";
import {GroqRateLimitError} from "./tutor-free-provider";
import {appRouter} from "./routers";
const env={GROQ_API_KEY:"private-groq-key"};
describe("English-only Groq Orpheus synthesis",()=>{
  it("uses current endpoint/model, voice ID, and validates binary WAV",async()=>{
    const wav=Buffer.alloc(48);wav.write("RIFF",0);wav.write("WAVE",8);
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(wav,{headers:{"content-type":"audio/wav"}}));
    const result=await synthesizeEnglish("I work as a welder.","hannah",env,request);
    expect(result).toEqual({audioBase64:wav.toString("base64"),audioMime:"audio/wav",text:"I work as a welder."});
    expect(request.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/audio/speech");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      model:"canopylabs/orpheus-v1-english",input:"I work as a welder.",voice:"hannah",response_format:"wav"
    });
    expect(GROQ_ENGLISH_VOICES).toContain("troy");
  });
  it.each([401,403,429,500])("rejects vendor HTTP %i with generic logging and no token leak",async status=>{
    const log=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response("private key private student text",{status}));
    try{
      const p=synthesizeEnglish("Hello.","troy",env,request);
      await expect(p).rejects.toThrow(status===429?GroqRateLimitError:"TTS rejected request");
      expect(JSON.stringify(log.mock.calls)).not.toContain("private");
      expect(log).toHaveBeenCalledWith("[tutor-tts] status="+status);
      expect(request).toHaveBeenCalledTimes(1);
    }finally{log.mockRestore();}
  });
  it.each([
    ["voice","voice must be one of the listed options"],
    ["model","model not available for this account"],
    ["format","response_format must be wav"],
    ["input","input must be less than 200 characters"],
    ["access","account access disabled"],
    ["unknown","private student name, key sk-DO-NOT-LOG"]
  ] as const)("classifies Groq 400 as %s without exposing the raw error text",async(reason,message)=>{
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const raw={error:{type:"invalid_request_error",message}};
    const request=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(raw),{status:400,headers:{"content-type":"application/json"}}));
    try{
      const error=await synthesizeEnglish("Hello there!","troy",env,request).then(()=>null,e=>e);
      expect(error).toBeInstanceOf(GroqTtsBadRequest);
      expect(error.reason).toBe(reason);
      expect(error.message).toBe("Groq TTS rejected a parameter");
      const logs=JSON.stringify(warn.mock.calls);
      expect(logs).not.toContain(message);
      expect(logs).not.toContain("sk-DO-NOT-LOG");
      expect(warn).toHaveBeenCalledWith("[tutor-tts] status=400 category="+reason);
      expect(request).toHaveBeenCalledTimes(1);
    }finally{warn.mockRestore();}
  });
  it("bounds the invalid-response body and still does not leak vendor contents",async()=>{
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({error:{message:"private input "+("x".repeat(5000))}}),{status:400}));
    try{
      await expect(synthesizeEnglish("Hello","troy",env,request)).rejects.toMatchObject({reason:"unknown"});
      expect(JSON.stringify(warn.mock.calls)).not.toContain("private");
      expect(request).toHaveBeenCalledOnce();
    }finally{warn.mockRestore();}
  });
  it("blocks bad voice, overlong text, and invalid server audio",async()=>{
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response("not-a-wav"));
    await expect(synthesizeEnglish("Hello.","made-up" as "troy",env,request)).rejects.toThrow("invalid voice");
    await expect(synthesizeEnglish("x".repeat(201),"troy",env,request)).rejects.toThrow("outside bounds");
    await expect(synthesizeEnglish("Hello.","troy",env,request)).rejects.toThrow("did not return WAV");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects anonymous synthesis",async()=>{
    const caller=appRouter.createCaller({user:null,req:{} as never,res:{} as never});
    await expect(caller.tutor.neuralEnglish({consent:true,provider:"groq",text:"Hello world!",voice:"troy"})).rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
});
