import { describe, expect, it } from "vitest";
import { applySrsReview, createInitialReviewState, replayReviewLogs } from "../shared/learning";
describe("learning final hard amendment", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const state = {...createInitialReviewState("7",now), state:"learning" as const,repetitions:2};
  it("promotes hard and good to one day, easy to four days, again resets", () => {
    for (const rating of ["hard","good"] as const) {
      const next = applySrsReview(state,rating,now);
      expect(next.state).toBe("review"); expect(next.intervalDays).toBe(1);
    }
    expect(applySrsReview(state,"easy",now).intervalDays).toBe(4);
    expect(applySrsReview(state,"again",now).repetitions).toBe(0);
  });
  it("does not change short hard or historical replay", () => {
    expect(applySrsReview({...state,repetitions:1},"hard",now).repetitions).toBe(1);
    expect(replayReviewLogs("7",[{knowledgeItemId:"7",rating:"hard",createdAt:now.toISOString(),legacyFinalHard:true}],state).state).toBe("learning");
    expect(replayReviewLogs("7",[{knowledgeItemId:"7",rating:"hard",createdAt:now.toISOString(),legacyFinalHard:false}],state).state).toBe("review");
  });
});
