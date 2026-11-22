import { describe, expect, it, vi } from "vitest";
import { greeting, systemInstructions, localReply, type TutorProfile } from "../shared/tutor";
import { paidTutorAllowed, withTutorBudget } from "./tutor-budget";
import { createOpenAITutor, speechConfigured } from "./tutor-provider";
import { appRouter } from "./routers";
const profile:TutorProfile={tutorName:"Natanael",tutorPersona:"curious",interest:"work"};
describe("Tutor staging",()=>{
  it("contextual welcome and honest fallback",()=>{
    expect(greeting(profile)).toContain("Natanael");
    expect(greeting(profile)).toContain("comunicação profissional");
    expect(systemInstructions(profile)).toContain("não confiáveis");
    expect(localReply("praticar")).toContain("sugestão guiada local");
  });
  it("requires key, enable flag and exact allowlist",()=>{
    const env={OPENAI_API_KEY:"test",LINGUA_TUTOR_ENABLED:"true",LINGUA_TUTOR_ALLOWED_EMAILS:"qa@example.com"};
    expect(paidTutorAllowed("QA@example.com",env)).toBe(true);
    expect(paidTutorAllowed("other@example.com",env)).toBe(false);
    expect(paidTutorAllowed("qa@example.com",{})).toBe(false);
  });
  it("blocks legacy speech after shutdown",()=>{
    const env={OPENAI_API_KEY:"test",LINGUA_TUTOR_TTS_PROVIDER:"openai-legacy",LINGUA_TUTOR_TTS_MODEL:"tts-1"};
    expect(speechConfigured(env,Date.parse("2026-12-01"))).toBe(true);
    expect(speechConfigured(env,Date.parse("2027-01-06"))).toBe(false);
  });
  it("uses file ASR and contextual chat, no TTS without opt-in",async()=>{
    const request=vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({text:"I work."})))
      .mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:"Let's practice."}}]})));
    const p=createOpenAITutor({OPENAI_API_KEY:"test"},request);
    expect(await p.transcribe(new Uint8Array([1,2,3]),"audio/webm")).toBe("I work.");
    expect((request.mock.calls[0][1]?.body as FormData).get("model")).toBe("gpt-transcribe");
    expect(await p.reply(profile,[],"I work.")).toBe("Let's practice.");
    expect(JSON.parse(String(request.mock.calls[1][1]?.body)).max_tokens).toBe(240);
    expect(await p.speak("Olá")).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("returns nonempty MP3 audio from the configured TTS adapter",async()=>{
    const mp3=new Uint8Array([73,68,51,4,0,0]);
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(mp3,{headers:{"Content-Type":"audio/mpeg"}}));
    const p=createOpenAITutor({OPENAI_API_KEY:"test",LINGUA_TUTOR_TTS_PROVIDER:"openai-legacy",LINGUA_TUTOR_TTS_MODEL:"tts-1"},request);
    // Fixed clock so the temporary integration test survives its planned sunset.
    const clock=vi.spyOn(Date,"now").mockReturnValue(Date.parse("2026-11-21T00:00:00Z"));
    try {
      expect(await p.speak("Olá")).toBe(Buffer.from(mp3).toString("base64"));
      expect(request.mock.calls[0][0]).toBe("https://api.openai.com/v1/audio/speech");
      expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({model:"tts-1",voice:"alloy",input:"Olá",response_format:"mp3"});
    } finally {clock.mockRestore();}
  });
  it("logs only allowlisted vendor codes and status, not secrets or learner text",async()=>{
    const log=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({error:{code:"insufficient_quota",message:"private student text secret-key"}}),{status:429}));
    const p=createOpenAITutor({OPENAI_API_KEY:"secret-key"},request);
    try {
      await expect(p.reply(profile,[],"private student text")).rejects.toThrow("provider rejected request");
      expect(log).toHaveBeenCalledWith("[tutor-provider] endpoint=chat/completions status=429 code=insufficient_quota");
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-key");
      expect(JSON.stringify(log.mock.calls)).not.toContain("private student text");
    } finally {log.mockRestore();}
  });
  it("counts failed paid requests and caps daily usage",async()=>{
    const now=Date.parse("2030-02-01");
    for(let i=0;i<30;i++)await expect(withTutorBudget(54321,async()=>{throw Error("failed");},now)).rejects.toThrow("failed");
    await expect(withTutorBudget(54321,async()=>true,now)).rejects.toMatchObject({code:"TOO_MANY_REQUESTS"});
    expect(await withTutorBudget(54321,async()=>true,now+86_400_000)).toBe(true);
  });
  it("protects tutor APIs from anonymous visitors",async()=>{
    const c=appRouter.createCaller({user:null,req:{} as never,res:{} as never});
    await expect(c.tutor.capabilities()).rejects.toMatchObject({code:"UNAUTHORIZED"});
    await expect(c.tutor.reply({message:"hi",history:[],consent:false,voice:false})).rejects.toMatchObject({code:"UNAUTHORIZED"});
    await expect(c.tutor.transcribe({consent:true,audio:{mime:"audio/webm",base64:"AAAA"}})).rejects.toMatchObject({code:"UNAUTHORIZED"});
    await expect(c.tutor.welcomeAudio({consent:true})).rejects.toMatchObject({code:"UNAUTHORIZED"});
  });
});
