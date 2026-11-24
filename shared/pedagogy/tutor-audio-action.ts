/** One visible audio control per tutor message; no provider calls or persistence here. */
export type TutorAudioAction = "none"|"player"|"welcome"|"neural"|"retry"|"local";
export type TutorAudioInputs = {
  assistant:boolean;
  hasAudio:boolean;
  isWelcome:boolean;
  consent:boolean;
  ttsAvailable:boolean;
  capabilitiesSettled:boolean;
  neuralEligible:boolean;
  neuralFailed:boolean;
  hasLocalVoice:boolean;
  speakingLocally:boolean;
};
export function audioActionFor(v:TutorAudioInputs):TutorAudioAction {
  if(!v.assistant)return "none";
  if(v.hasAudio)return "player";
  if(v.speakingLocally && v.hasLocalVoice)return "local";
  // The greeting's dedicated TTS action owns its slot; never show two controls.
  if(v.isWelcome && v.consent && v.ttsAvailable)return "welcome";
  // Initial loading must not flip the button; a failed query can still use local TTS.
  if(!v.capabilitiesSettled)return "none";
  if(v.neuralEligible)return v.neuralFailed?(v.hasLocalVoice?"local":"retry"):"neural";
  return v.hasLocalVoice?"local":"none";
}

/** Resolve UI-level capabilities without relying on React, TTS or browser globals. */
export type TutorAudioContext = Omit<TutorAudioInputs,"neuralEligible"|"hasLocalVoice"> & {
  provider:string|undefined;
  tutorEnabled:boolean;
  neuralAvailable:boolean;
  hasEnglishPhrase:boolean;
  hasEnglishLocalVoice:boolean;
  hasGeneralLocalVoice:boolean;
};
export type TutorResolvedAudio = {
  action:TutorAudioAction;
  localVoiceKind:"english"|"general"|null;
};
export function resolveTutorAudio(context:TutorAudioContext):TutorResolvedAudio {
  // For English examples, the fallback must be an English voice.
  // Without an English example, Portuguese/general voices remain eligible.
  const localVoiceKind=context.hasEnglishPhrase
    ? (context.hasEnglishLocalVoice?"english":null)
    : (context.hasGeneralLocalVoice?"general":null);
  const action=audioActionFor({
    assistant:context.assistant,
    hasAudio:context.hasAudio,
    isWelcome:context.isWelcome,
    consent:context.consent,
    ttsAvailable:context.ttsAvailable,
    capabilitiesSettled:context.capabilitiesSettled,
    neuralEligible:context.tutorEnabled&&context.provider==="groq"&&context.consent&&
      context.neuralAvailable&&context.hasEnglishPhrase,
    neuralFailed:context.neuralFailed,
    hasLocalVoice:localVoiceKind!==null,
    speakingLocally:context.speakingLocally,
  });
  return {action,localVoiceKind};
}
