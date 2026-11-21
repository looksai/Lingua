import type { SpeechSubmission, SpeechTranscription } from "./speech-contract";

export interface SpeechTranscriber {
  transcribe(submission: SpeechSubmission): Promise<SpeechTranscription>;
}

/**
 * Adaptador local para validar o fluxo antes de conectar Whisper/whisper.cpp.
 * Nunca deve ser tratado como transcrição real nem como evidência de domínio.
 */
export const demoSpeechTranscriber: SpeechTranscriber = {
  async transcribe() {
    return {
      status: "complete",
      provider: "browser-demo",
      language: "en-US",
      segments: [
        {
          startMs: 0,
          endMs: 4200,
          text: "The station is busy. The repair team is ready to help.",
          confidence: 0.42,
        },
      ],
      uncertainty: "high",
    };
  },
};
