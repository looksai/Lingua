import {describe,it,expect} from "vitest";
import {availableLocalVoices,selectLocalVoice,speechReady,speechText} from "./tutor-speech";

const voices=[
  {name:"Browser remote",lang:"pt-BR",voiceURI:"remote",localService:false},
  {name:"English installed",lang:"en-US",voiceURI:"en-local",localService:true},
  {name:"Português instalado",lang:"pt-BR",voiceURI:"pt-local",localService:true},
];
describe("Tutor local voice inventory",()=>{
  it("never offers remote voices or treats remote-only TTS as local",()=>{
    expect(availableLocalVoices(voices).map(v=>v.voiceURI)).toEqual(["en-local","pt-local"]);
    expect(availableLocalVoices([voices[0]])).toEqual([]);
    expect(speechReady([voices[0]])).toBe(false);
  });
  it("honors selected local voice and falls back to a locally installed voice",()=>{
    expect(selectLocalVoice(voices,"en-local")?.voiceURI).toBe("en-local");
    expect(selectLocalVoice(voices,"missing")?.voiceURI).toBe("pt-local");
    expect(selectLocalVoice([voices[1]],"")?.voiceURI).toBe("en-local");
    expect(selectLocalVoice([voices[0]],"")).toBeNull();
  });
  it("strips Markdown formatting for audio without changing the visible message",()=>{
    const message="Vamos praticar **MIG welding** e [TIG welding](https://example.org)!\n# Hello.";
    expect(speechText(message)).toBe("Vamos praticar MIG welding e TIG welding! Hello.");
    expect(message).toContain("**MIG welding**");
    expect(speechText(" ")).toBe("");
    expect(speechText("x".repeat(2000))).toHaveLength(1200);
  });
});
