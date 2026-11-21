export type ShadowingGuidance =
  | "steady"
  | "slow-down"
  | "slow-up"
  | "notice-pauses"
  | "listen-again";

export type ShadowingFeedback = {
  source: "local";
  deterministic: true;
  referenceDurationMs: number;
  learnerDurationMs?: number;
  durationRatio?: number;
  durationDeviationPercent?: number;
  pauseThresholdMs: number;
  pauseCount?: number;
  pauseDurationMs?: number;
  pauseRate?: number;
  guidance: ShadowingGuidance;
  limitations: string[];
};

const LIMITATIONS = [
  "Não calcula fonemas, pronúncia, inteligibilidade ou alinhamento lexical.",
  "É feedback formativo, não nota, domínio ou certificação.",
];

function rms(samples: Float32Array, start: number, end: number) {
  if (end <= start) return 0;
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += samples[index] ** 2;
  return Math.sqrt(sum / (end - start));
}

export function analyzeShadowingAudio(
  referenceSamples: Float32Array,
  learnerSamples: Float32Array,
  referenceSampleRate: number,
  learnerSampleRate = referenceSampleRate,
  options: { pauseThresholdMs?: number; silenceRms?: number } = {}
): ShadowingFeedback {
  const pauseThresholdMs = options.pauseThresholdMs ?? 300;
  const silenceRms = options.silenceRms ?? 0.018;
  const windowSize = Math.max(1, Math.round(learnerSampleRate * 0.02));
  const pauseWindows = Math.max(
    1,
    Math.ceil((learnerSamples.length || 1) / windowSize)
  );
  let pauseCount = 0;
  let pauseDurationMs = 0;
  let inPause = false;
  let currentPauseMs = 0;
  for (let window = 0; window < pauseWindows; window += 1) {
    const start = window * windowSize;
    const end = Math.min(learnerSamples.length, start + windowSize);
    const silent = rms(learnerSamples, start, end) <= silenceRms;
    if (silent) {
      currentPauseMs += ((end - start) / learnerSampleRate) * 1000;
      if (!inPause && currentPauseMs >= pauseThresholdMs) {
        pauseCount += 1;
        inPause = true;
      }
    } else {
      if (inPause) pauseDurationMs += currentPauseMs;
      currentPauseMs = 0;
      inPause = false;
    }
  }
  if (inPause) pauseDurationMs += currentPauseMs;

  const referenceDurationMs = Math.round(
    (referenceSamples.length / referenceSampleRate) * 1000
  );
  const learnerDurationMs = Math.round(
    (learnerSamples.length / learnerSampleRate) * 1000
  );
  const durationRatio = learnerDurationMs / Math.max(1, referenceDurationMs);
  const durationDeviationPercent = Math.round(
    Math.abs(durationRatio - 1) * 100
  );
  const pauseRate = pauseDurationMs / Math.max(1, learnerDurationMs);
  const guidance: ShadowingGuidance =
    pauseCount >= 3 || pauseRate > 0.35
      ? "notice-pauses"
      : durationRatio > 1.25
        ? "slow-up"
        : durationRatio < 0.75
          ? "slow-down"
          : "steady";

  return {
    source: "local",
    deterministic: true,
    referenceDurationMs,
    learnerDurationMs,
    durationRatio: Number(durationRatio.toFixed(3)),
    durationDeviationPercent,
    pauseThresholdMs,
    pauseCount,
    pauseDurationMs: Math.round(pauseDurationMs),
    pauseRate: Number(pauseRate.toFixed(3)),
    guidance,
    limitations: LIMITATIONS,
  };
}
