import {GROQ_ENGLISH_VOICES,synthesizeEnglish,type GroqEnglishVoice} from "./groq-tts";

// Contract for future backends; only Groq is implemented/enabled at this stage.
// Never select another provider on failure or quota exhaustion.
export type VoiceProviderId="groq"|"kokoro"|"elevenlabs"|"wavespeed"|"local";
export type VoiceRequest={
  text:string;
  voice:string;
  language:"en-US";
  format:"wav";
};
export type VoiceResult={audioBase64:string;audioMime:"audio/wav";text:string};
export interface VoiceProvider {
  readonly id:VoiceProviderId;
  readonly supports:{language:"en-US";format:"wav";maxCharacters:number};
  synthesize(request:VoiceRequest):Promise<VoiceResult>;
}

// Explicit selection prevents accidental API charges and avoids hidden fallback.
// Future adapters must independently implement VoiceProvider, get audited,
// and be enabled by a deliberate product/configuration change.
export function createVoiceProvider(
  id:VoiceProviderId="groq",
  groqSynthesis:typeof synthesizeEnglish=synthesizeEnglish
):VoiceProvider{
  if(id!=="groq")throw Error("voice provider is not configured");
  return {
    id:"groq",
    supports:{language:"en-US",format:"wav",maxCharacters:200},
    async synthesize(request){
      if(request.language!=="en-US"||request.format!=="wav")throw Error("voice capability unsupported");
      if(!GROQ_ENGLISH_VOICES.includes(request.voice as GroqEnglishVoice))
        throw Error("invalid Groq voice");
      return groqSynthesis(request.text,request.voice as GroqEnglishVoice);
    }
  };
}
