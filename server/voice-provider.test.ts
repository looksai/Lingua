import {describe,it,expect,vi} from "vitest";
import {createVoiceProvider,type VoiceProviderId} from "./voice-provider";
import {synthesizeEnglish} from "./groq-tts";

describe("VoiceProvider — Groq-only safe abstraction",()=>{
  const request={text:"Hello, I work as a welder.",voice:"hannah",language:"en-US" as const,format:"wav" as const};
  it("preserves the existing Groq adapter's exact input and WAV result",async()=>{
    const fake=vi.fn<typeof synthesizeEnglish>().mockResolvedValue({audioBase64:"UklGRg==",audioMime:"audio/wav",text:request.text});
    const adapter=createVoiceProvider("groq",fake);
    expect(adapter.id).toBe("groq");
    expect(adapter.supports).toEqual({language:"en-US",format:"wav",maxCharacters:200});
    await expect(adapter.synthesize(request)).resolves.toMatchObject({audioMime:"audio/wav",text:request.text});
    expect(fake).toHaveBeenCalledOnce();
    expect(fake).toHaveBeenCalledWith(request.text,"hannah");
  });
  it("rejects unimplemented providers explicitly without hidden fallback",async()=>{
    const fake=vi.fn<typeof synthesizeEnglish>();
    for(const id of ["kokoro","elevenlabs","wavespeed","local"] as VoiceProviderId[]){
      expect(()=>createVoiceProvider(id,fake)).toThrow("voice provider is not configured");
    }
    expect(fake).not.toHaveBeenCalled();
  });
  it("rejects unsupported language/format or foreign provider voice before calling the vendor",async()=>{
    const fake=vi.fn<typeof synthesizeEnglish>();
    const adapter=createVoiceProvider("groq",fake);
    await expect(adapter.synthesize({...request,language:"pt-BR" as "en-US"})).rejects.toThrow("capability unsupported");
    await expect(adapter.synthesize({...request,format:"mp3" as "wav"})).rejects.toThrow("capability unsupported");
    await expect(adapter.synthesize({...request,voice:"unverified-cloned-voice"})).rejects.toThrow("invalid Groq voice");
    expect(fake).not.toHaveBeenCalled();
  });
  it("propagates Groq failures without retries or fallback",async()=>{
    const fake=vi.fn<typeof synthesizeEnglish>().mockRejectedValue(Error("vendor 429"));
    const adapter=createVoiceProvider("groq",fake);
    await expect(adapter.synthesize(request)).rejects.toThrow("vendor 429");
    expect(fake).toHaveBeenCalledOnce();
  });
});
