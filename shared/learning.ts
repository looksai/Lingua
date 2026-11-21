export type KnowledgeItemKind = "word" | "phrase";
export type SrsRating = "again" | "hard" | "good" | "easy";
export type SrsState = "new" | "learning" | "review" | "relearning";

export type KnowledgeItem = {
  id: string;
  kind: KnowledgeItemKind;
  text: string;
  normalizedText: string;
  language: string;
  translation?: string;
  example?: string;
  pronunciation?: string[];
  audioUrl?: string;
  sourceId?: string;
  sourceRecordId?: string;
  license?: string;
  curriculumAnchors: string[];
};

export type ReviewState = {
  knowledgeItemId: string;
  state: SrsState;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt?: string;
};

export type ReviewResult = ReviewState & {
  rating: SrsRating;
  quality: 0 | 3 | 4 | 5;
  nextIntervalLabel: string;
};

export type SrsReviewOptions = {
  random?: () => number;
  jitterRatio?: number;
  userId?: string;
  itemId?: string;
  // Historical pre-amendment reviews retain their original scheduling semantics.
  legacyFinalHard?: boolean;
};

const RATING_QUALITY: Record<SrsRating, 0 | 3 | 4 | 5> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};
const LEARNING_STEPS_MINUTES = [1, 10, 24 * 60];
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3;
const MAX_INTERVAL_DAYS = 3650;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function roundInterval(days: number) {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

function nextEaseFactor(easeFactor: number, quality: 0 | 3 | 4 | 5) {
  return Math.min(
    MAX_EASE_FACTOR,
    Math.max(
      MIN_EASE_FACTOR,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  );
}

function stableRandom(
  state: ReviewState,
  rating: SrsRating,
  options: SrsReviewOptions
) {
  const source = `${options.userId ?? "anonymous"}:${options.itemId ?? state.knowledgeItemId}:${state.state}:${state.repetitions}:${rating}`;
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function jitteredInterval(
  days: number,
  state: ReviewState,
  rating: SrsRating,
  options: SrsReviewOptions
) {
  const ratio = options.jitterRatio ?? 0.05;
  const random = Math.min(
    1,
    Math.max(0, options.random?.() ?? stableRandom(state, rating, options))
  );
  const factor = 1 + (random * 2 - 1) * ratio;
  return roundInterval(Math.min(MAX_INTERVAL_DAYS, days) * factor);
}

export function normalizeKnowledgeText(text: string) {
  return text.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function createKnowledgeItem(
  input: Omit<KnowledgeItem, "normalizedText">
): KnowledgeItem {
  return { ...input, normalizedText: normalizeKnowledgeText(input.text) };
}

export function createInitialReviewState(
  knowledgeItemId: string,
  now = new Date()
): ReviewState {
  return {
    knowledgeItemId,
    state: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: now.toISOString(),
  };
}

function learningDueAt(state: ReviewState, rating: SrsRating, now: Date) {
  if (rating === "again") return addMinutes(now, LEARNING_STEPS_MINUTES[0]);
  const step =
    rating === "hard" && state.state !== "new"
      ? state.repetitions
      : state.repetitions + (rating === "easy" ? 2 : 1);
  const nextStep = Math.min(step, LEARNING_STEPS_MINUTES.length - 1);
  return addMinutes(now, LEARNING_STEPS_MINUTES[nextStep]);
}

export function applySrsReview(
  state: ReviewState,
  rating: SrsRating,
  now = new Date(),
  options: SrsReviewOptions = {}
): ReviewResult {
  const quality = RATING_QUALITY[rating];
  const next: ReviewState = {
    ...state,
    lastReviewedAt: now.toISOString(),
    easeFactor: nextEaseFactor(state.easeFactor, quality),
  };

  if (rating === "again") {
    next.state = state.state === "review" || state.state === "relearning"
      ? "relearning" : "learning";
    next.lapses = state.lapses + (state.state === "review" ? 1 : 0);
    next.repetitions = 0;
    next.intervalDays = 0;
    next.dueAt = learningDueAt(state, rating, now).toISOString();
  } else if (
    state.state === "new" ||
    state.state === "learning" ||
    state.state === "relearning"
  ) {
    const completedLearning =
      rating === "easy" ||
      (state.repetitions >= LEARNING_STEPS_MINUTES.length - 1 &&
        (rating !== "hard" || (state.state === "learning" && !options.legacyFinalHard)));
    if (completedLearning) {
      next.state = "review";
      next.repetitions = Math.max(1, state.repetitions + 1);
      next.intervalDays = jitteredInterval(
        rating === "easy" ? 4 : 1,
        state,
        rating,
        options
      );
      next.dueAt = addDays(now, next.intervalDays).toISOString();
    } else {
      next.state = state.state === "relearning" ? "relearning" : "learning";
      next.repetitions =
        state.repetitions +
        (rating === "hard" && state.state !== "new" ? 0 : 1);
      next.intervalDays = 0;
      next.dueAt = learningDueAt(state, rating, now).toISOString();
    }
  } else {
    next.state = "review";
    next.repetitions = state.repetitions + 1;
    const multiplier =
      rating === "hard"
        ? 1.2
        : rating === "easy"
          ? next.easeFactor * 1.3
          : next.easeFactor;
    next.intervalDays = jitteredInterval(
      state.intervalDays * multiplier,
      state,
      rating,
      options
    );
    next.dueAt = addDays(now, next.intervalDays).toISOString();
  }

  return {
    ...next,
    rating,
    quality,
    nextIntervalLabel: formatInterval(new Date(next.dueAt), now),
  };
}

export type ReviewLogForReplay = {
  knowledgeItemId: string;
  rating: SrsRating;
  createdAt: string;
  operationId?: string;
  sequence?: number; // trusted DB commit order, not client-controlled
  legacyFinalHard?: boolean; // per-operation historical scheduling rule
};

export function replayReviewLogs(
  knowledgeItemId: string,
  logs: ReviewLogForReplay[],
  initialState = createInitialReviewState(knowledgeItemId),
  options: Pick<SrsReviewOptions, "userId" | "itemId"> & { databaseFloat32?: boolean } = {}
): ReviewState {
  return logs
    .filter(log => log.knowledgeItemId === knowledgeItemId)
    .slice()
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) ||
        ((a.sequence != null && b.sequence != null) ? a.sequence - b.sequence :
          (a.operationId ?? "").localeCompare(b.operationId ?? ""))
    )
    .reduce(
      (state, log) => {
        const next = applySrsReview(state, log.rating, new Date(log.createdAt), {
          ...options, itemId: options.itemId ?? knowledgeItemId,
          legacyFinalHard: log.legacyFinalHard,
        });
        return options.databaseFloat32
          ? { ...next, easeFactor: Math.fround(next.easeFactor) }
          : next;
      },
      initialState
    );
}

export function previewSrsIntervals(
  state: ReviewState,
  now = new Date()
): Record<SrsRating, string> {
  return {
    again: applySrsReview(state, "again", now).nextIntervalLabel,
    hard: applySrsReview(state, "hard", now).nextIntervalLabel,
    good: applySrsReview(state, "good", now).nextIntervalLabel,
    easy: applySrsReview(state, "easy", now).nextIntervalLabel,
  };
}

export function formatInterval(dueAt: Date, now = new Date()) {
  const minutes = Math.max(
    1,
    Math.round((dueAt.getTime() - now.getTime()) / 60000)
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.max(1, Math.round(hours / 24));
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}
