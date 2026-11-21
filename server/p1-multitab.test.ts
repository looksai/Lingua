import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LearningQueueLockUnavailableError, subscribeLearningQueue, withLearningQueueLock,
} from "../client/src/lib/offline-coordination";
import {
  enqueueLearningOperationCoordinated, enqueueLearningOperation,
  getPendingLearningOperations, pendingLearningCount, replayPendingLearningOperations,
} from "../client/src/lib/offline-learning";

class MockWebLocks {
  private occupied = new Set<string>();
  private waiters = new Map<string, Array<() => void>>();
  async request<T>(
    name: string, options: { ifAvailable?: boolean },
    callback: (lock: { name: string } | null) => Promise<T> | T
  ): Promise<T> {
    if (this.occupied.has(name) && options.ifAvailable) return callback(null);
    while (this.occupied.has(name)) {
      await new Promise<void>(resolve => {
        const waiters = this.waiters.get(name) ?? [];
        waiters.push(resolve);
        this.waiters.set(name, waiters);
      });
    }
    this.occupied.add(name);
    try { return await callback({ name }); }
    finally {
      this.occupied.delete(name);
      this.waiters.get(name)?.shift()?.();
    }
  }
}
const storage = new Map<string, string>();
const listeners = new Map<string, Set<(event: unknown) => void>>();
let locks: MockWebLocks;
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
beforeEach(() => {
  storage.clear();
  listeners.clear();
  locks = new MockWebLocks();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
    dispatchEvent: (event: Event) => {
      for (const callback of listeners.get(event.type) ?? []) callback(event);
      return true;
    },
    addEventListener: (name: string, cb: (event: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(cb);
    },
    removeEventListener: (name: string, cb: (event: unknown) => void) => {
      listeners.get(name)?.delete(cb);
    },
  });
  vi.stubGlobal("navigator", { locks });
  vi.stubGlobal("BroadcastChannel", undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("P1 cross-tab integrity", () => {
  it("fails closed without Web Locks and does not enqueue", async () => {
    vi.stubGlobal("navigator", {});
    await expect(enqueueLearningOperationCoordinated(101, {
      type: "review", knowledgeItemId: 7, rating: "good",
    })).rejects.toBeInstanceOf(LearningQueueLockUnavailableError);
    expect(pendingLearningCount(101)).toBe(0);
    expect(storage.size).toBe(0);
  });
  it("second tab waits for the same-user lock and re-reads the queue", async () => {
    enqueueLearningOperation(101, { type: "review", knowledgeItemId: 7, rating: "good" });
    const entered = deferred();
    const release = deferred();
    const primary = withLearningQueueLock(101, async () => {
      entered.release(); await release.promise;
    });
    await entered.promise;
    let calls = 0;
    const secondTab = replayPendingLearningOperations(101, {
      save: async () => 7,
      review: async () => { calls++; },
      remove: async () => {},
    });
    await Promise.resolve();
    expect(calls).toBe(0);
    expect(pendingLearningCount(101)).toBe(1);
    release.release();
    await primary;
    expect(await secondTab).toEqual({ synced: true, remaining: 0 });
    expect(calls).toBe(1);
  });
  it("writes enqueued during replay are serialized, not lost", async () => {
    const first = enqueueLearningOperation(101, {
      type: "review", knowledgeItemId: 7, rating: "good",
    });
    const entered = deferred();
    const release = deferred();
    const replay = replayPendingLearningOperations(101, {
      save: async () => 7,
      review: async () => { entered.release(); await release.promise; },
      remove: async () => {},
    });
    await entered.promise;
    const queued = enqueueLearningOperationCoordinated(101, {
      type: "review", knowledgeItemId: 8, rating: "easy",
    });
    expect(getPendingLearningOperations(101).map(op => op.id)).toEqual([first.id]);
    release.release();
    await replay;
    const added = await queued;
    expect(getPendingLearningOperations(101).map(op => op.id)).toEqual([added.id]);
  });
  it("a newly mounted view retries after a coalesced replay was cancelled", async () => {
    enqueueLearningOperation(303, { type: "review", knowledgeItemId: 7, rating: "good" });
    let calls = 0;
    const api = {
      save: async () => 7,
      review: async () => { calls++; },
      remove: async () => {},
    };
    const cancelled = replayPendingLearningOperations(303, api, () => true);
    const active = replayPendingLearningOperations(303, api, () => false);
    expect(await cancelled).toEqual({ synced: false, remaining: 1 });
    expect(await active).toEqual({ synced: true, remaining: 0 });
    expect(calls).toBe(1);
  });
  it("isolates locks by authenticated owner", async () => {
    const entered = deferred();
    const release = deferred();
    const firstTab = withLearningQueueLock(101, async () => {
      entered.release(); await release.promise;
    });
    await entered.promise;
    expect(await withLearningQueueLock(202, () => "ok", { ifAvailable: true })).toBe("ok");
    expect(await withLearningQueueLock(101, () => "wrong", { ifAvailable: true })).toBeUndefined();
    release.release();
    await firstTab;
  });
  it("only matching storage events update a user's counter", () => {
    let count = 0;
    const stop = subscribeLearningQueue(101, () => count++);
    expect(count).toBe(1);
    for (const cb of listeners.get("storage") ?? []) cb({ key: "lingua.learning.pending.v2.user.202" });
    expect(count).toBe(1);
    for (const cb of listeners.get("storage") ?? []) cb({ key: "lingua.learning.pending.v2.user.101" });
    expect(count).toBe(2);
    stop();
    for (const cb of listeners.get("storage") ?? []) cb({ key: "lingua.learning.pending.v2.user.101" });
    expect(count).toBe(2);
  });
});
