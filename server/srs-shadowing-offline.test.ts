import { describe, expect, it } from "vitest";
import {
  applySrsReview,
  createInitialReviewState,
  replayReviewLogs,
  type ReviewState,
  type SrsRating,
} from "../shared/learning";
import { analyzeShadowingAudio } from "../client/src/lib/shadowing-feedback";
import {
  deduplicateLearningOperations,
  filterFreshLearningOperations,
  type PendingLearningOperation,
} from "../client/src/lib/offline-learning";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const ratings: SrsRating[] = ["again", "hard", "good", "easy"];
const states: ReviewState[] = [
  createInitialReviewState("item", NOW),
  {
    ...createInitialReviewState("item", NOW),
    state: "learning",
    repetitions: 1,
  },
  {
    ...createInitialReviewState("item", NOW),
    state: "review",
    repetitions: 3,
    intervalDays: 10,
  },
  {
    ...createInitialReviewState("item", NOW),
    state: "relearning",
    repetitions: 1,
  },
];

describe("SM-2 P0 contract", () => {
  it.each(
    states.flatMap(state =>
      ratings.map(rating => [state.state, rating] as const)
    )
  )("produces a transition for %s/%s", (stateName, rating) => {
    const state = states.find(candidate => candidate.state === stateName)!;
    const result = applySrsReview(state, rating, NOW, { random: () => 0.5 });
    expect(result.rating).toBe(rating);
    expect(result.quality).toBe(
      { again: 0, hard: 3, good: 4, easy: 5 }[rating]
    );
    expect(new Date(result.dueAt).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("keeps EF between 1.3 and 3.0 and applies the SM-2 equation", () => {
    const low = { ...states[2], easeFactor: 1.3 };
    const high = { ...states[2], easeFactor: 3 };
    expect(
      applySrsReview(low, "again", NOW, { random: () => 0.5 }).easeFactor
    ).toBe(1.3);
    expect(
      applySrsReview(high, "easy", NOW, { random: () => 0.5 }).easeFactor
    ).toBe(3);
    expect(
      applySrsReview(states[2], "hard", NOW, { random: () => 0.5 }).easeFactor
    ).toBe(2.36);
  });

  it("advances new+hard to the 10-minute step", () => {
    const result = applySrsReview(states[0], "hard", NOW, {
      random: () => 0.5,
    });
    expect(result.state).toBe("learning");
    expect(result.repetitions).toBe(1);
    expect(result.nextIntervalLabel).toBe("10 min");
  });

  it("promotes learning and restarts relearning", () => {
    const learning = { ...states[1], repetitions: 2 };
    expect(
      applySrsReview(learning, "good", NOW, { random: () => 0.5 }).state
    ).toBe("review");
    const relearning = applySrsReview(states[2], "again", NOW, {
      random: () => 0.5,
    });
    expect(relearning.state).toBe("relearning");
    expect(relearning.lapses).toBe(states[2].lapses + 1);
    expect(
      applySrsReview(relearning, "again", NOW, { random: () => 0.5 })
        .nextIntervalLabel
    ).toBe("1 min");
  });

  it("applies deterministic jitter from an injected seed", () => {
    const state = { ...states[2], intervalDays: 100 };
    const low = applySrsReview(state, "good", NOW, {
      random: () => 0,
      jitterRatio: 0.05,
    });
    const high = applySrsReview(state, "good", NOW, {
      random: () => 1,
      jitterRatio: 0.05,
    });
    expect(low.intervalDays).toBe(238);
    expect(high.intervalDays).toBe(263);
  });

  it("uses 25 days for good from interval 10 and EF 2.5 without jitter", () => {
    const state = { ...states[2], intervalDays: 10, easeFactor: 2.5 };
    const result = applySrsReview(state, "good", NOW, { jitterRatio: 0 });
    expect(result.intervalDays).toBe(25);
  });

  it("uses a fixed four-day easy interval while applying EF before promotion", () => {
    const result = applySrsReview(states[0], "easy", NOW, {
      jitterRatio: 0,
    });
    expect(result.state).toBe("review");
    expect(result.easeFactor).toBe(2.6);
    expect(result.intervalDays).toBe(4);
  });

  it("seeds production jitter with user and item identity", () => {
    const state = { ...states[2], intervalDays: 100 };
    const first = applySrsReview(state, "good", NOW, {
      userId: "user-a",
      itemId: "item-a",
    });
    const retry = applySrsReview(state, "good", NOW, {
      userId: "user-a",
      itemId: "item-a",
    });
    const differentItem = applySrsReview(state, "good", NOW, {
      userId: "user-a",
      itemId: "item-b",
    });
    expect(retry.intervalDays).toBe(first.intervalDays);
    expect(differentItem.intervalDays).not.toBe(first.intervalDays);
  });

  it("reconstructs the same state as incremental application", () => {
    const logs = [
      {
        knowledgeItemId: "item",
        rating: "good" as const,
        createdAt: NOW.toISOString(),
      },
      {
        knowledgeItemId: "item",
        rating: "good" as const,
        createdAt: new Date(NOW.getTime() + 10 * 60_000).toISOString(),
      },
    ];
    const incremental = logs.reduce(
      (state, log) =>
        applySrsReview(state, log.rating, new Date(log.createdAt)),
      createInitialReviewState("item", NOW)
    );
    expect(replayReviewLogs("item", logs)).toMatchObject(incremental);
  });

  it("does not add another lapse when again repeats during relearning", () => {
    const relearning = applySrsReview(states[2], "again", NOW, {
      jitterRatio: 0,
    });
    const repeatedAgain = applySrsReview(relearning, "again", NOW, {
      jitterRatio: 0,
    });
    expect(relearning.lapses).toBe(states[2].lapses + 1);
    expect(repeatedAgain.lapses).toBe(relearning.lapses);
  });
});

describe("offline learning and local shadowing", () => {
  const operation = (
    id: string,
    createdAt: string
  ): PendingLearningOperation => ({
    id,
    type: "review",
    knowledgeItemId: 7,
    rating: "good",
    createdAt,
  });
  it("does not replay the same operation twice in the local queue", () => {
    const result = deduplicateLearningOperations([
      operation("same", NOW.toISOString()),
      operation("same", NOW.toISOString()),
    ]);
    expect(result).toHaveLength(1);
  });
  it("expires operations older than the documented 30-day window", () => {
    const old = new Date(
      NOW.getTime() - 31 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(
      filterFreshLearningOperations(
        [operation("old", old), operation("new", NOW.toISOString())],
        NOW
      )
    ).toHaveLength(1);
  });
  it("produces local feedback without network or authentication", () => {
    const reference = new Float32Array(1000).fill(0.2);
    const learner = new Float32Array(1500).fill(0.2);
    const feedback = analyzeShadowingAudio(reference, learner, 2000, 1000);
    expect(feedback.source).toBe("local");
    expect(feedback.deterministic).toBe(true);
    expect(feedback.guidance).toBe("slow-up");
  });
});
