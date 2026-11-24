/**
 * Client transcripts are not independent typed answers.
 * Missing modality is unknown provenance and must not be graded as typed.
 * The client hint itself is not cryptographic attestation.
 */
export type TutorInputModality="typed"|"asr_text";
export function modalityForTutorReply(transcriptReady:boolean):TutorInputModality {
  return transcriptReady?"asr_text":"typed";
}
export function safeTutorModality(modality:TutorInputModality|undefined):TutorInputModality {
  return modality==="typed"?"typed":"asr_text";
}

/** Editing a recognized transcript does not turn it into independently typed work.
 * Only an emptied draft makes a new composition explicitly typed. */
export function transcriptOriginAfterEdit(previouslyTranscribed:boolean,nextText:string):boolean {
  return previouslyTranscribed&&nextText.trim().length>0;
}
