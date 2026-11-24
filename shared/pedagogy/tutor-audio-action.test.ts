import {describe,expect,it} from "vitest";
import {audioActionFor, resolveTutorAudio, type TutorAudioContext, type TutorAudioInputs} from "./tutor-audio-action";
const initial:TutorAudioInputs={
  assistant:true,hasAudio:false,isWelcome:false,consent:true,ttsAvailable:true,
  capabilitiesSettled:true,neuralEligible:true,neuralFailed:false,hasLocalVoice:true,speakingLocally:false
};
const action=(changes:Partial<TutorAudioInputs>={})=>audioActionFor({...initial,...changes});
describe("single tutor audio action",()=>{
  it("prioritizes neural, with one action",()=>expect(action()).toBe("neural"));
  it("shows local only after neural failure when available",()=>expect(action({neuralFailed:true})).toBe("local"));
  it("offers retry if neural fails and local voice is absent",()=>expect(action({neuralFailed:true,hasLocalVoice:false})).toBe("retry"));
  it("allows neural without a local voice",()=>expect(action({hasLocalVoice:false})).toBe("neural"));
  it("uses local voice if neural is ineligible",()=>expect(action({neuralEligible:false})).toBe("local"));
  it("hides action if neither provider is available",()=>expect(action({neuralEligible:false,hasLocalVoice:false})).toBe("none"));
  it("does not turn a player into another button",()=>expect(action({hasAudio:true})).toBe("player"));
  it("never offers audio for learner messages",()=>expect(action({assistant:false})).toBe("none"));
  it("does not flip to local before capabilities load",()=>expect(action({capabilitiesSettled:false})).toBe("none"));
  it("uses local voice after a failed capabilities request",()=>expect(action({capabilitiesSettled:true,neuralEligible:false})).toBe("local"));
  it("has no ghost neural button when tutor is disabled",()=>expect(action({neuralEligible:false,hasLocalVoice:false})).toBe("none"));
  it("retains stop control when local speech is active",()=>expect(action({speakingLocally:true})).toBe("local"));
  it("avoids duplicate welcome buttons",()=>expect(action({isWelcome:true})).toBe("welcome"));
  it("uses a single fallback control for welcome if external TTS is unavailable",()=>expect(action({isWelcome:true,ttsAvailable:false,neuralEligible:false})).toBe("local"));
  it("does not use dedicated greeting TTS without consent",()=>expect(action({isWelcome:true,consent:false,neuralEligible:false})).toBe("local"));
  it("never omits a local control for an available voice once capabilities settle",()=>{
    for(let flags=0;flags<32;flags++){
      const v={...initial,assistant:true,hasAudio:false,capabilitiesSettled:true,hasLocalVoice:true,
        isWelcome:Boolean(flags&1),neuralEligible:Boolean(flags&2),neuralFailed:Boolean(flags&4),
        consent:Boolean(flags&8),ttsAvailable:Boolean(flags&16)};
      expect(audioActionFor(v)).not.toBe("none");
    }
  });
  it("satisfies the safety invariants for every one of the 1024 policy inputs",()=>{
    const fields:(keyof TutorAudioInputs)[]=[
      "assistant","hasAudio","isWelcome","consent","ttsAvailable",
      "capabilitiesSettled","neuralEligible","neuralFailed","hasLocalVoice","speakingLocally"
    ];
    for(let mask=0;mask<2**fields.length;mask++){
      const v={...initial};
      fields.forEach((key,i)=>{v[key]=Boolean(mask & (1<<i));});
      const actual=audioActionFor(v);
      expect(["none","player","welcome","neural","retry","local"]).toContain(actual);
      if(!v.assistant)expect(actual).toBe("none");
      if(v.assistant&&v.hasAudio)expect(actual).toBe("player");
      if(actual==="player")expect(v.assistant&&v.hasAudio).toBe(true);
      if(actual==="local")expect(v.hasLocalVoice).toBe(true);
      if(actual==="neural"||actual==="retry")expect(v.neuralEligible).toBe(true);
      if(actual==="neural")expect(v.neuralFailed).toBe(false);
      if(actual==="retry")expect(v.neuralFailed&&!v.hasLocalVoice).toBe(true);
      if(v.assistant&&!v.hasAudio&&v.speakingLocally&&v.hasLocalVoice)expect(actual).toBe("local");
      if(actual==="welcome")expect(v.assistant&&v.isWelcome&&v.consent&&v.ttsAvailable).toBe(true);
    }
  });
});

const context:TutorAudioContext={
  assistant:true,hasAudio:false,isWelcome:false,consent:true,ttsAvailable:false,
  capabilitiesSettled:true,provider:"groq",tutorEnabled:true,neuralAvailable:true,
  hasEnglishPhrase:true,hasEnglishLocalVoice:true,hasGeneralLocalVoice:true,
  neuralFailed:false,speakingLocally:false
};
const resolved=(overrides:Partial<TutorAudioContext>)=>resolveTutorAudio({...context,...overrides});
describe("audio capability resolution used by React UI",()=>{
  it("requires a suitable English voice for English fallback",()=>{
    expect(resolved({hasEnglishLocalVoice:false,neuralFailed:true}).action).toBe("retry");
    expect(resolved({hasEnglishLocalVoice:false,neuralFailed:true}).localVoiceKind).toBeNull();
  });
  it("uses the chosen general voice when there is no English example",()=>{
    expect(resolved({hasEnglishPhrase:false,hasEnglishLocalVoice:false}).action).toBe("local");
    expect(resolved({hasEnglishPhrase:false}).localVoiceKind).toBe("general");
  });
  it("does not use Portuguese voice for an English example when Groq is absent",()=>{
    expect(resolved({provider:"openai",hasEnglishLocalVoice:false}).action).toBe("none");
  });
  it("uses local English TTS after neural error when available",()=>{
    expect(resolved({neuralFailed:true}).action).toBe("local");
    expect(resolved({neuralFailed:true}).localVoiceKind).toBe("english");
  });
  it("never shows neural control when the tutor is disabled",()=>{
    expect(resolved({tutorEnabled:false}).action).toBe("local");
    expect(resolved({tutorEnabled:false,hasEnglishLocalVoice:false}).action).toBe("none");
  });
  it("selects local after a failed capabilities query",()=>{
    expect(resolved({capabilitiesSettled:true,neuralAvailable:false}).action).toBe("local");
  });
  it("does not flip to local during initial capabilities loading",()=>{
    expect(resolved({capabilitiesSettled:false,neuralAvailable:false}).action).toBe("none");
  });
  it("requires consent to offer Groq TTS",()=>{
    expect(resolved({consent:false}).action).toBe("local");
  });
  it("does not offer neural TTS for a different provider",()=>{
    expect(resolved({provider:"openai"}).action).toBe("local");
  });
  it("keeps player precedence independent of provider state",()=>{
    expect(resolved({hasAudio:true,provider:undefined}).action).toBe("player");
  });
});
