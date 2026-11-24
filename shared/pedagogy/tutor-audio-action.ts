/** One visible audio control per tutor message; no provider calls or persistence here. */
export type TutorAudioAction = "none"|"player"|"welcome"|"neural"|"retry"|"local";
export type TutorAudioInputs = {
  assistant:boolean;
  hasAudio:boolean;
  isWelcome:boolean;
  consent:boolean;
  ttsAvailable:boolean;
  capabilitiesReady:boolean;
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
  // Wait for capabilities before choosing browser TTS to prevent control flipping.
  if(!v.capabilitiesReady)return "none";
  if(v.neuralEligible)return v.neuralFailed?(v.hasLocalVoice?"local":"retry"):"neural";
  return v.hasLocalVoice?"local":"none";
}
