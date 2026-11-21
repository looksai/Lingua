import { afterEach, describe, expect, it, vi } from "vitest";
import { privateKnowledgeItemKey } from "./knowledge-ownership";
import {
  createPendingLearningOperation,
  enqueueLearningOperation,
  getPendingLearningOperations,
  pendingLearningCount,
  replayPendingLearningOperations,
} from "../client/src/lib/offline-learning";
import { applySrsReview, createInitialReviewState, replayReviewLogs } from "../shared/learning";

const storage = new Map<string, string>();
let networkCalls = 0;
function setup() {
  storage.clear();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  };
  vi.stubGlobal("window", { localStorage, dispatchEvent: () => true });
  vi.stubGlobal("navigator", { locks: {
    request: async (_name: string, _options: unknown, callback: (lock: unknown) => Promise<unknown>) =>
      callback({ name: _name, mode: "exclusive" }),
  } });
  networkCalls = 0;
}
afterEach(() => vi.unstubAllGlobals());
const word = { itemKey:"reading-lab:ready", kind:"word" as const, text:"ready", normalizedText:"ready", language:"en" };

describe("Lingua P0: offline isolation and durable operation identity", () => {
  it("keeps queues isolated between user A and user B", () => {
    setup();
    enqueueLearningOperation(101, { type:"review", knowledgeItemId:7, rating:"good" });
    expect(pendingLearningCount(101)).toBe(1);
    expect(pendingLearningCount(202)).toBe(0);
    expect([...storage.keys()]).toEqual(["lingua.learning.pending.v2.user.101"]);
  });

  it("does not attach unidentified legacy global queue to any authenticated user", () => {
    setup();
    storage.set("lingua.learning.pending.v1", '[{"id":"from-another-account"}]');
    expect(getPendingLearningOperations(101)).toEqual([]);
    expect(storage.has("lingua.learning.pending.v1")).toBe(true);
  });

  it("uses the exact same operation ID for lost ACK and retry", async () => {
    setup();
    const op = createPendingLearningOperation({ type:"review", knowledgeItemId:7, rating:"good" });
    const firstSentId = op.id;
    // A network timeout after server commit must queue the original operation.
    enqueueLearningOperation(101, op);
    const ack = await replayPendingLearningOperations(101, {
      save: async () => { throw Error("unused"); },
      review: async input => { networkCalls++; expect(input.operationId).toBe(firstSentId); },
      remove: async () => {},
    });
    expect(ack.synced).toBe(true);
    expect(ack.remaining).toBe(0);
    expect(networkCalls).toBe(1);
  });

  it("rebinds a locally referenced review after server save ACK and restart", async () => {
    setup();
    enqueueLearningOperation(101, { type:"save", clientKey:"ready", payload:word });
    enqueueLearningOperation(101, { type:"review", clientKey:"ready", rating:"good" });
    const ids:string[]=[];
    const saveAck = await replayPendingLearningOperations(101, {
      save: async () => 77,
      review: async input => { expect(input.knowledgeItemId).toBe(77); ids.push(input.operationId); throw Error("connection lost"); },
      remove: async () => {},
    }).catch(error => error as Error);
    expect(saveAck).toBeInstanceOf(Error);
    expect(getPendingLearningOperations(101)).toEqual([
      expect.objectContaining({ type:"review", knowledgeItemId:77 })
    ]);
    const recovered = await replayPendingLearningOperations(101, {
      save: async () => { throw Error("save must not repeat"); },
      review: async input => { expect(input.operationId).toBe(ids[0]); expect(input.knowledgeItemId).toBe(77); },
      remove: async () => {},
    });
    expect(recovered.synced).toBe(true);
    expect(pendingLearningCount(101)).toBe(0);
  });

  it("stops at unresolved ID instead of falsely declaring synced", async () => {
    setup();
    enqueueLearningOperation(101, { type:"review", clientKey:"missing", rating:"good" });
    enqueueLearningOperation(101, { type:"remove", knowledgeItemId:77 });
    await expect(replayPendingLearningOperations(101, {
      save: async () => 77,
      review: async () => {},
      remove: async () => { networkCalls++; },
    })).rejects.toThrow(/no confirmed server item ID/);
    expect(pendingLearningCount(101)).toBe(2);
    expect(networkCalls).toBe(0);
  });

  it("places a late failed save ahead of a dependent review", () => {
    setup();
    enqueueLearningOperation(101, { type:"review", clientKey:"ready", rating:"good" });
    enqueueLearningOperation(101, { type:"save", clientKey:"ready", payload:word });
    expect(getPendingLearningOperations(101).map(op => op.type)).toEqual(["save","review"]);
  });

  it("keeps operations available when browser storage write fails", () => {
    setup();
    vi.stubGlobal("window", { dispatchEvent:()=>true, localStorage: {
      getItem: (k:string) => storage.get(k) ?? null,
      setItem: () => { throw Error("quota"); },
    }});
    enqueueLearningOperation(303, { type:"review", knowledgeItemId:7, rating:"good" });
    expect(pendingLearningCount(303)).toBe(1);
  });
});

describe("Lingua P0: seeded deterministic reconstruction", () => {
  it("matches a server review sequence using the same learner/item jitter seed", () => {
    const now = new Date("2026-11-20T12:00:00.000Z");
    const base = { ...createInitialReviewState("7", now), state:"review" as const, repetitions:3, intervalDays:100 };
    const expected = applySrsReview(base,"good",now,{userId:"101",itemId:"7"});
    const replayed = replayReviewLogs("7", [
      {knowledgeItemId:"7",rating:"good",createdAt:now.toISOString(),operationId:"stable-op"},
    ], base, {userId:"101",itemId:"7"});
    expect(replayed.intervalDays).toBe(expected.intervalDays);
    expect(replayed.dueAt).toBe(expected.dueAt);
  });
  it("keeps relearning state after repeated failure (spec section 5)", () => {
    const now = new Date("2026-11-20T12:00:00.000Z");
    const reviewed = { ...createInitialReviewState("7", now), state:"review" as const, intervalDays:6 };
    const lapse = applySrsReview(reviewed,"again",now,{jitterRatio:0});
    expect(applySrsReview(lapse,"again",now,{jitterRatio:0}).state).toBe("relearning");
  });
});

describe("Lingua P0: shared catalogue boundaries", () => {
  it("derives per-learner keys that cannot claim global catalogue names", async () => {
    const original = "reading-lab:ready";
    const keyA = await privateKnowledgeItemKey(101, original);
    const keyB = await privateKnowledgeItemKey(202, original);
    expect(keyA).toMatch(/^learner:[0-9a-f]{64}$/);
    expect(keyB).not.toBe(keyA);
    expect(keyA).not.toBe(original);
    expect(await privateKnowledgeItemKey(101, original)).toBe(keyA);
  });
});
