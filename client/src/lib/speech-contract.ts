export type SpeechPipelineStage =
  | "idle"
  | "recording"
  | "recorded"
  | "transcription-pending"
  | "transcribed"
  | "analysis-pending"
  | "evidence-ready";

export type SpeechSubmission = {
  id: string;
  sessionId: string;
  anchorId: string;
  mimeType: string;
  durationSeconds: number;
  consentVersion: string;
  createdAt: string;
};

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
};

export type SpeechTranscription = {
  status: "pending" | "complete" | "failed";
  provider: "browser-demo" | "whisper" | "whisper-cpp";
  language: string;
  segments: TranscriptSegment[];
  uncertainty: "low" | "medium" | "high";
  error?: string;
};

export type SpeechAnalysis = {
  status: "pending" | "complete" | "failed";
  evidenceKind: "retrieval" | "application" | "transfer";
  indicators: Array<"intelligibility" | "target-form" | "context-fit" | "self-correction">;
  confidence: number;
  notes: string[];
};

export type SpeechObservationCandidate = {
  submissionId: string;
  anchorId: string;
  transcriptText: string;
  evidenceKind: "application";
  status: "candidate";
  reviewer: "student";
  corrected: boolean;
  uncertainty: "low" | "medium" | "high";
  notes: string[];
};

export type SpeechEvaluation = {
  submission: SpeechSubmission;
  transcription: SpeechTranscription;
  analysis: SpeechAnalysis;
  audit: {
    implementation: "browser-demo" | "speech-adapter" | "csle-engine";
    authority: "proposal-only";
    consentVersion: string;
  };
};

export interface SpeechEvaluator {
  transcribe(submission: SpeechSubmission): Promise<SpeechTranscription>;
  analyze(input: { submission: SpeechSubmission; transcription: SpeechTranscription }): Promise<SpeechAnalysis>;
}

export const pendingSpeechEvaluation: SpeechEvaluation = {
  submission: {
    id: "speech-demo-001",
    sessionId: "demo-session-001",
    anchorId: "be-forms",
    mimeType: "audio/webm",
    durationSeconds: 0,
    consentVersion: "demo-1",
    createdAt: "2026-11-20T07:15:00Z",
  },
  transcription: {
    status: "pending",
    provider: "browser-demo",
    language: "en-US",
    segments: [],
    uncertainty: "high",
  },
  analysis: {
    status: "pending",
    evidenceKind: "application",
    indicators: ["intelligibility", "target-form", "context-fit"],
    confidence: 0,
    notes: ["A gravação ainda aguarda um adaptador de transcrição."],
  },
  audit: {
    implementation: "browser-demo",
    authority: "proposal-only",
    consentVersion: "demo-1",
  },
};
