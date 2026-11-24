import {describe,it,expect} from "vitest";
import {modalityForTutorReply,safeTutorModality} from "./tutor-input-modality";
describe("CAL input provenance guard",()=>{
  it("marks a transcript from the microphone as ASR, not independent typed work",()=>{
    expect(modalityForTutorReply(true)).toBe("asr_text");
  });
  it("preserves genuinely typed answers",()=>expect(modalityForTutorReply(false)).toBe("typed"));
  it("fails closed on absent modality from old clients",()=>{
    expect(safeTutorModality(undefined)).toBe("asr_text");
  });
  it("retains explicit ASR hint",()=>expect(safeTutorModality("asr_text")).toBe("asr_text"));
  it("allows explicitly marked typed inputs",()=>expect(safeTutorModality("typed")).toBe("typed"));
});
