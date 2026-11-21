/** P1: Web Locks own shared queue mutations; broadcasts only notify observers. */
export type LearningUserId = number | string;
const OWNER_PREFIX = "lingua.learning.pending.v2.user.";
const LOCK_PREFIX = "lingua.learning.queue.lock.v1.user.";
const CHANNEL_PREFIX = "lingua.learning.queue.changed.v1.user.";
function ownerSuffix(userId: LearningUserId): string {
  const id = String(userId);
  if (!/^[1-9][0-9]{0,15}$/.test(id))
    throw new Error("Authenticated numeric userId required for cross-tab coordination");
  return id;
}
export class LearningQueueLockUnavailableError extends Error {
  constructor() {
    super("Cross-tab queue lock unavailable: no operations were sent or stored under an unsafe fallback");
    this.name = "LearningQueueLockUnavailableError";
  }
}
/** Browsers without native Web Locks fail closed. Node without window is isolated. */
export async function withLearningQueueLock<T>(
  userId: LearningUserId,
  work: () => Promise<T> | T,
  options: { ifAvailable?: boolean } = {}
): Promise<T | undefined> {
  const id = ownerSuffix(userId);
  if (typeof window === "undefined") return work();
  const manager = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!manager?.request) throw new LearningQueueLockUnavailableError();
  return manager.request(`${LOCK_PREFIX}${id}`, {
    mode: "exclusive",
    ifAvailable: options.ifAvailable ?? false,
  }, async lock => {
    if (!lock) return undefined;
    return work();
  });
}
/** No personal information is placed in cross-tab notifications. */
export function signalLearningQueueChanged(userId: LearningUserId, persisted: boolean) {
  const id = ownerSuffix(userId);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lingua:offline-queue"));
  if (!persisted || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${id}`);
    channel.postMessage("changed");
    channel.close();
  } catch { /* storage events remain available when localStorage works */ }
}
export function subscribeLearningQueue(userId: LearningUserId, refresh: () => void) {
  const id = ownerSuffix(userId);
  if (typeof window === "undefined") return () => {};
  const storageKey = `${OWNER_PREFIX}${id}`;
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("lingua:offline-queue", refresh);
  window.addEventListener("online", refresh);
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(`${CHANNEL_PREFIX}${id}`);
      channel.onmessage = () => refresh();
    } catch { /* storage event fallback */ }
  }
  refresh();
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("lingua:offline-queue", refresh);
    window.removeEventListener("online", refresh);
    channel?.close();
  };
}
