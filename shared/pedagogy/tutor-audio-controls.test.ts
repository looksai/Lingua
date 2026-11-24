import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {TutorAudioControls} from "../../client/src/components/TutorAudioControls";
import {resolveTutorAudio,type TutorAudioAction,type TutorAudioContext} from "./tutor-audio-action";

const props={
  action:"neural" as TutorAudioAction,tutorName:"Naruto",busy:false,generating:false,
  recording:false,permissionPending:false,speakingLocally:false,
  hasEnglishPhrase:true,voiceUnavailable:false,
  onNeural:()=>{},onLocal:()=>{},onWelcome:()=>{},
};
const render=(overrides:Partial<typeof props>={})=>
  renderToStaticMarkup(createElement(TutorAudioControls,{...props,...overrides}));
const buttonCount=(html:string)=>(html.match(/<button\b/g)||[]).length;
describe("actual React audio controls (server-rendered markup)",()=>{
  it("renders exactly one neural button and names the tutor",()=>{
    const html=render();
    expect(buttonCount(html)).toBe(1);
    expect(html).toContain("Ouvir frase em inglês");
    expect(html).toContain('aria-label="Ouvir frase em inglês de Naruto"');
  });
  it("shows retry when neural failed and no local voice exists",()=>{
    const html=render({action:"retry"});
    expect(buttonCount(html)).toBe(1);
    expect(html).toContain("Tentar novamente");
    expect(html).not.toContain("voz local");
  });
  it("retains a stop button while the browser speaks",()=>{
    const html=render({action:"local",speakingLocally:true});
    expect(buttonCount(html)).toBe(1);
    expect(html).toContain(">Parar</button>");
    expect(html).toContain("Parar áudio de Naruto");
  });
  it("uses a transparent English-only local label",()=>{
    const html=render({action:"local"});
    expect(html).toContain("Ouvir frase (voz local)");
    expect(html).not.toContain("Ouvir frase em inglês</button>");
  });
  it("uses generic voice label for messages without English",()=>{
    expect(render({action:"local",hasEnglishPhrase:false})).toContain("Ouvir (voz local)");
  });
  it("has one welcome action and no ordinary listen action",()=>{
    const html=render({action:"welcome"});
    expect(buttonCount(html)).toBe(1);
    expect(html).toContain("Preparar áudio das boas-vindas");
    expect(html).not.toContain("Tentar novamente");
  });
  it("never creates a second player button for existing or absent audio",()=>{
    for(const action of ["player","none"] as TutorAudioAction[]){
      expect(buttonCount(render({action}))).toBe(0);
    }
  });
  it("disables audio controls while recording or waiting on permission",()=>{
    for(const action of ["neural","retry","local","welcome"] as TutorAudioAction[]){
      expect(render({action,recording:true})).toContain("disabled");
      expect(render({action,permissionPending:true})).toContain("disabled");
    }
  });
  it("only neural and welcome actions inherit the global busy lock",()=>{
    expect(render({action:"neural",busy:true})).toContain("disabled");
    expect(render({action:"welcome",busy:true})).toContain("disabled");
    expect(render({action:"local",busy:true})).not.toContain('disabled=""');
  });
  it("shows generation feedback only on the initiating neural button",()=>{
    expect(render({action:"neural",generating:true})).toContain("Preparando áudio");
    expect(render({action:"neural",generating:false})).not.toContain("Preparando áudio");
  });
  it("reports external audio failure without creating duplicate controls",()=>{
    const html=render({action:"retry",voiceUnavailable:true});
    expect(buttonCount(html)).toBe(1);
    expect(html).toContain("Áudio externo indisponível");
  });
});

const context:TutorAudioContext={
  assistant:true,hasAudio:false,isWelcome:false,consent:true,ttsAvailable:false,
  capabilitiesSettled:true,provider:"groq",tutorEnabled:true,neuralAvailable:true,
  hasEnglishPhrase:true,hasEnglishLocalVoice:true,hasGeneralLocalVoice:true,
  neuralFailed:false,speakingLocally:false,
};
describe("policy-to-React integration",()=>{
  it("renders at most one button for every combination of its eleven boolean inputs",()=>{
    const fields:(keyof TutorAudioContext)[]=[
      "assistant","hasAudio","isWelcome","consent","ttsAvailable",
      "capabilitiesSettled","tutorEnabled","neuralAvailable",
      "hasEnglishPhrase","hasEnglishLocalVoice","hasGeneralLocalVoice",
      "neuralFailed","speakingLocally",
    ];
    // Exhaustive 2^13 options: conditions are synthetic; no browser/voice services invoked.
    for(let mask=0;mask<2**fields.length;mask++){
      const cfg={...context};
      for(let i=0;i<fields.length;i++){
        const field=fields[i];(cfg as Record<string,unknown>)[field]=Boolean(mask&(1<<i));
      }
      const chosen=resolveTutorAudio(cfg).action;
      const html=render({action:chosen});
      expect(buttonCount(html)).toBe(chosen==="none"||chosen==="player"?0:1);
    }
  });
});
