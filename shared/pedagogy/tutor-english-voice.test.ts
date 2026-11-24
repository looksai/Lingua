import {describe,expect,it} from "vitest";
import {selectEnglishLocalVoice,selectLocalVoice,type LocalVoice} from "../../client/src/lib/tutor-speech";

const voice=(voiceURI:string,lang:string,localService=true):LocalVoice=>({voiceURI,lang,localService,name:voiceURI});
describe("offline voice selection for English teaching",()=>{
  it("chooses an English local voice over the preferred Portuguese voice",()=>{
    const voices=[voice("pt","pt-BR"),voice("us","en-US")];
    expect(selectLocalVoice(voices,"pt")?.voiceURI).toBe("pt");
    expect(selectEnglishLocalVoice(voices,"pt")?.voiceURI).toBe("us");
  });
  it("never uses a Portuguese voice for English practice",()=>{
    expect(selectEnglishLocalVoice([voice("pt","pt-BR")],"pt")).toBeNull();
  });
  it("never sends learner text through a nonlocal browser voice",()=>{
    expect(selectEnglishLocalVoice([voice("remote","en-US",false)],"remote")).toBeNull();
  });
  it("honors a user-selected English local voice",()=>{
    const voices=[voice("us","en-US"),voice("uk","en-GB")];
    expect(selectEnglishLocalVoice(voices,"uk")?.voiceURI).toBe("uk");
  });
  it("prefers en-US if selected voice is another language",()=>{
    const voices=[voice("uk","en-GB"),voice("pt","pt-BR"),voice("us","en-US")];
    expect(selectEnglishLocalVoice(voices,"pt")?.voiceURI).toBe("us");
  });
});
