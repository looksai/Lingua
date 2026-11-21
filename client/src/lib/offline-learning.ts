import { signalLearningQueueChanged, withLearningQueueLock } from "./offline-coordination";

/** Lingua P1: queue ownership, stable operation identity and ACK-safe replay.
 * This is operational SRS telemetry, never evidence of mastery.
 * The legacy global key is deliberately NOT adopted into an authenticated account.
 */
export type OfflineSaveItem = {
  itemKey: string;
  kind: "word" | "phrase";
  text: string;
  normalizedText: string;
  language: string;
  translation?: string;
  example?: string;
  pronunciation?: string;
  audioUrl?: string;
  sourceId?: string;
  sourceRecordId?: string;
  license?: string;
  curriculumAnchors?: string;
};

type OperationBase = { id: string; createdAt: string };
export type PendingLearningOperation =
  | (OperationBase & { type: "save"; clientKey: string; payload: OfflineSaveItem })
  | (OperationBase & {
      type: "review";
      clientKey?: string;
      knowledgeItemId?: number;
      rating: "again" | "hard" | "good" | "easy";
    })
  | (OperationBase & {
      type: "remove";
      clientKey?: string;
      knowledgeItemId?: number;
    });
export type PendingLearningInput =
  | Omit<Extract<PendingLearningOperation, { type: "save" }>, keyof OperationBase>
  | Omit<Extract<PendingLearningOperation, { type: "review" }>, keyof OperationBase>
  | Omit<Extract<PendingLearningOperation, { type: "remove" }>, keyof OperationBase>;

const PREFIX = "lingua.learning.pending.v2.user.";
const MAX_PENDING_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// The per-session fallback preserves local practice if storage is unavailable.
// It is NOT durable across browser shutdown, and the UI must not call it synced.
const volatileQueues = new Map<string, PendingLearningOperation[]>();
const volatileOnly = new Set<string>();
const isBrowser = () => typeof window !== "undefined";

function queueKey(userId: number | string): string {
  const id = String(userId);
  if (!/^[1-9][0-9]{0,15}$/.test(id))
    throw new Error("Authenticated numeric userId required for offline queue");
  return `${PREFIX}${id}`;
}
function parseQueue(value: string | null): PendingLearningOperation[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? (parsed as PendingLearningOperation[]) : [];
  } catch {
    return [];
  }
}
function readQueue(userId: number | string): PendingLearningOperation[] {
  const key = queueKey(userId);
  if (!isBrowser() || volatileOnly.has(key)) return volatileQueues.get(key) ?? [];
  try {
    return parseQueue(window.localStorage.getItem(key));
  } catch {
    return volatileQueues.get(key) ?? [];
  }
}
function writeQueue(userId: number | string, queue: PendingLearningOperation[]) {
  let persisted = false;
  const key = queueKey(userId);
  volatileQueues.set(key, queue);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(queue));
      volatileOnly.delete(key);
      persisted = true;
    } catch {
      volatileOnly.add(key);
      // Kept in session memory; do not silently attach it to a different user.
    }
    signalLearningQueueChanged(userId, persisted);
  }
}
function operationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function createPendingLearningOperation(
  operation: PendingLearningInput
): PendingLearningOperation {
  return { ...operation, id: operationId(), createdAt: new Date().toISOString() } as PendingLearningOperation;
}
export function filterFreshLearningOperations(
  queue: PendingLearningOperation[],
  now = new Date(),
  maxAgeMs = MAX_PENDING_AGE_MS
) {
  const cutoff = now.getTime() - maxAgeMs;
  return queue.filter(operation => {
    const created = Date.parse(operation.createdAt);
    return Number.isFinite(created) && created >= cutoff;
  });
}
export function deduplicateLearningOperations(queue: PendingLearningOperation[]) {
  const seen = new Set<string>();
  return queue.filter(operation => {
    if (seen.has(operation.id)) return false;
    seen.add(operation.id);
    return true;
  });
}
export function normalizePendingLearningOperations(
  queue: PendingLearningOperation[], now = new Date()
) {
  return deduplicateLearningOperations(filterFreshLearningOperations(queue, now));
}
export function getPendingLearningOperations(userId: number | string) {
  const current = readQueue(userId);
  const normalized = normalizePendingLearningOperations(current);
  // No unlocked, side-effecting normalization reads across tabs.
  return normalized;
}
export function pendingLearningCount(userId: number | string) {
  return getPendingLearningOperations(userId).length;
}
export function enqueueLearningOperation(
  userId: number | string,
  input: PendingLearningInput | PendingLearningOperation
) {
  const next = "id" in input ? input : createPendingLearningOperation(input);
  const queue = getPendingLearningOperations(userId);
  // If the save ACK arrives after the review was queued, save must still precede it.
  const dependent = next.type === "save"
    ? queue.findIndex(op => op.type !== "save" && op.clientKey === next.clientKey)
    : -1;
  if (dependent >= 0) queue.splice(dependent, 0, next);
  else queue.push(next);
  writeQueue(userId, deduplicateLearningOperations(queue));
  return next;
}
/** Browser UI must use this async serialized path, not the legacy sync primitive. */
export async function enqueueLearningOperationCoordinated(
  userId: number | string,
  input: PendingLearningInput | PendingLearningOperation
): Promise<PendingLearningOperation> {
  const stable = "id" in input ? input : createPendingLearningOperation(input);
  const result = await withLearningQueueLock(userId, () => enqueueLearningOperation(userId, stable));
  if (!result) throw new Error("Queue lock did not grant ownership");
  return result;
}
export function removePendingLearningOperation(userId: number | string, id: string) {
  writeQueue(userId, getPendingLearningOperations(userId).filter(op => op.id !== id));
}
/** Atomically rebind dependents and remove the acknowledged save in one storage write. */
export function acknowledgeSavedLearningItem(
  userId: number | string, saveId: string, clientKey: string, knowledgeItemId: number
) {
  if (!Number.isSafeInteger(knowledgeItemId) || knowledgeItemId <= 0)
    throw new Error("Invalid server knowledgeItemId");
  const queue = getPendingLearningOperations(userId);
  if (!queue.some(op => op.id === saveId && op.type === "save" && op.clientKey === clientKey))
    throw new Error("Save operation missing from queue");
  writeQueue(userId, queue.filter(op => op.id !== saveId).map(op =>
    op.type !== "save" && op.clientKey === clientKey
      ? { ...op, knowledgeItemId }
      : op
  ));
}

/** Resolve a saved ID even when the first online save was never queued. */
export function resolvePendingLearningItem(
  userId: number | string, clientKey: string, knowledgeItemId: number
) {
  if (!Number.isSafeInteger(knowledgeItemId) || knowledgeItemId <= 0)
    throw new Error("Invalid server knowledgeItemId");
  writeQueue(userId, getPendingLearningOperations(userId).map(op =>
    op.type !== "save" && op.clientKey === clientKey
      ? { ...op, knowledgeItemId }
      : op
  ));
}

/** Browser rebindings serialize with enqueue and replay across tabs. */
export async function resolvePendingLearningItemCoordinated(
  userId: number | string, clientKey: string, knowledgeItemId: number
) {
  await withLearningQueueLock(userId,
    () => resolvePendingLearningItem(userId, clientKey, knowledgeItemId));
}

export type LearningReplayApi = {
  save: (item: OfflineSaveItem) => Promise<number>;
  review: (input: { knowledgeItemId: number; rating: "again" | "hard" | "good" | "easy"; operationId: string }) => Promise<unknown>;
  remove: (knowledgeItemId: number) => Promise<unknown>;
};
/** Never skip unresolved operations, never report synced while anything remains. */
const inFlightReplays = new Map<string, Promise<{ synced: boolean; remaining: number }>>();
export function replayPendingLearningOperations(
  userId: number | string,
  api: LearningReplayApi,
  shouldStop: () => boolean = () => false
): Promise<{ synced: boolean; remaining: number }> {
  const key = queueKey(userId);
  const alreadyRunning = inFlightReplays.get(key);
  if (alreadyRunning) return alreadyRunning;
  const run = async () => {
  // Wait for the previous tab, acquire exclusive ownership, and re-read the queue.
  // All ACK updates and dependent rebindings remain inside the lock.
  const result = await withLearningQueueLock(userId, async () => {
  if (shouldStop()) return { synced: false, remaining: pendingLearningCount(userId) };
  const ids = getPendingLearningOperations(userId).map(op => op.id);
  for (const id of ids) {
    if (shouldStop()) return { synced: false, remaining: pendingLearningCount(userId) };
    const op = getPendingLearningOperations(userId).find(candidate => candidate.id === id);
    if (!op) continue;
    if (op.type === "save") {
      const serverId = await api.save(op.payload);
      acknowledgeSavedLearningItem(userId, op.id, op.clientKey, serverId);
    } else {
      if (!op.knowledgeItemId)
        throw new Error(`Pending ${op.type} ${op.id} has no confirmed server item ID`);
      if (op.type === "review")
        await api.review({ knowledgeItemId: op.knowledgeItemId, rating: op.rating, operationId: op.id });
      else await api.remove(op.knowledgeItemId);
      removePendingLearningOperation(userId, op.id);
    }
  }
  const remaining = pendingLearningCount(userId);
  return { synced: remaining === 0, remaining };
  });
  return result ?? { synced: false, remaining: pendingLearningCount(userId) };
  };
  const promise = run().finally(() => {
    if (inFlightReplays.get(key) === promise) inFlightReplays.delete(key);
  });
  inFlightReplays.set(key, promise);
  return promise;
}
