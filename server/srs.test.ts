import { describe, expect, it } from "vitest";
import {
  applySrsReview,
  createInitialReviewState,
  createKnowledgeItem,
  normalizeKnowledgeText,
  previewSrsIntervals,
} from "../shared/learning";

const NOW = new Date("2026-11-20T12:00:00.000Z");

describe("knowledge items", () => {
  it("normalizes words without changing the learner-facing text", () => {
    const item = createKnowledgeItem({
      id: "word-ready",
      kind: "word",
      text: "  Ready  ",
      language: "en",
      translation: "pronto",
      curriculumAnchors: ["be-forms"],
    });

    expect(item.text).toBe("  Ready  ");
    expect(item.normalizedText).toBe("ready");
    expect(normalizeKnowledgeText("The   tools")).toBe("the tools");
  });
});

describe("SRS", () => {
  it("starts a new item with visible learning steps", () => {
    const state = createInitialReviewState("word-ready", NOW);
    const preview = previewSrsIntervals(state, NOW);

    expect(state.state).toBe("new");
    expect(preview.again).toBe("1 min");
    expect(preview.good).toBe("10 min");
    expect(preview.easy).toBe("4 dias");
  });

  it("moves a known item into review and preserves uncertainty-free scheduling data", () => {
    const state = createInitialReviewState("word-ready", NOW);
    const first = applySrsReview(state, "good", NOW);
    const second = applySrsReview(
      first,
      "good",
      new Date("2026-11-20T12:10:00.000Z")
    );

    expect(first.state).toBe("learning");
    expect(first.nextIntervalLabel).toBe("10 min");
    expect(second.state).toBe("learning");
    expect(second.repetitions).toBe(2);
    expect(second.nextIntervalLabel).toBe("1 dia");
  });

  it("reduces ease and increments lapses when a review item is forgotten", () => {
    const state = {
      ...createInitialReviewState("word-ready", NOW),
      state: "review" as const,
      intervalDays: 6,
      repetitions: 3,
      easeFactor: 2.5,
    };
    const result = applySrsReview(state, "again", NOW);

    expect(result.state).toBe("relearning");
    expect(result.lapses).toBe(1);
    expect(result.nextIntervalLabel).toBe("1 min");
  });

  it("uses longer intervals for easy reviews than good reviews", () => {
    const state = {
      ...createInitialReviewState("word-ready", NOW),
      state: "review" as const,
      intervalDays: 6,
      repetitions: 3,
      easeFactor: 2.5,
    };

    const good = applySrsReview(state, "good", NOW);
    const easy = applySrsReview(state, "easy", NOW);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
    expect(easy.easeFactor).toBeGreaterThan(good.easeFactor);
  });
});
