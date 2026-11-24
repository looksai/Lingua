import {describe,expect,it} from "vitest";
import {audioActionFor, type TutorAudioInputs} from "./tutor-audio-action";
const initial:TutorAudioInputs={
  assistant:true,hasAudio:false,isWelcome:false,consent:true,ttsAvailable:true,
  capabilitiesReady:true,neuralEligible:true,neuralFailed:false,hasLocalVoice:true,speakingLocally:false
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
  it("does not flip to local before capabilities load",()=>expect(action({capabilitiesReady:false})).toBe("none"));
  it("retains stop control when local speech is active",()=>expect(action({speakingLocally:true})).toBe("local"));
  it("avoids duplicate welcome buttons",()=>expect(action({isWelcome:true})).toBe("welcome"));
  it("uses a single fallback control for welcome if external TTS is unavailable",()=>expect(action({isWelcome:true,ttsAvailable:false,neuralEligible:false})).toBe("local"));
  it("does not use dedicated greeting TTS without consent",()=>expect(action({isWelcome:true,consent:false,neuralEligible:false})).toBe("local"));
});
