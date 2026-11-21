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
  | (OperationBase & {
      type: "save";
      clientKey: string;
      payload: OfflineSaveItem;
    })
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
  | Omit<
      Extract<PendingLearningOperation, { type: "save" }>,
      "id" | "createdAt"
    >
  | Omit<
      Extract<PendingLearningOperation, { type: "review" }>,
      "id" | "createdAt"
    >
  | Omit<
      Extract<PendingLearningOperation, { type: "remove" }>,
      "id" | "createdAt"
    >;

const STORAGE_KEY = "lingua.learning.pending.v1";
const MAX_PENDING_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const isBrowser = () => typeof window !== "undefined";

function parseQueue(value: string | null): PendingLearningOperation[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? (parsed as PendingLearningOperation[]) : [];
  } catch {
    return [];
  }
}
function readQueue() {
  return isBrowser()
    ? parseQueue(window.localStorage.getItem(STORAGE_KEY))
    : [];
}
function writeQueue(queue: PendingLearningOperation[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("lingua:offline-queue"));
}
function operationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
export function deduplicateLearningOperations(
  queue: PendingLearningOperation[]
) {
  const seen = new Set<string>();
  return queue.filter(operation => {
    if (seen.has(operation.id)) return false;
    seen.add(operation.id);
    return true;
  });
}
export function normalizePendingLearningOperations(
  queue: PendingLearningOperation[],
  now = new Date()
) {
  return deduplicateLearningOperations(
    filterFreshLearningOperations(queue, now)
  );
}
export function getPendingLearningOperations() {
  const current = readQueue();
  const normalized = normalizePendingLearningOperations(current);
  if (isBrowser() && normalized.length !== current.length)
    writeQueue(normalized);
  return normalized;
}
export function pendingLearningCount() {
  return getPendingLearningOperations().length;
}
export function enqueueLearningOperation(operation: PendingLearningInput) {
  const next = {
    ...operation,
    id: operationId(),
    createdAt: new Date().toISOString(),
  } as PendingLearningOperation;
  writeQueue(
    deduplicateLearningOperations([...getPendingLearningOperations(), next])
  );
  return next;
}
export function removePendingLearningOperation(id: string) {
  writeQueue(
    getPendingLearningOperations().filter(operation => operation.id !== id)
  );
}
