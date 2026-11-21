/** Server-side per-learner namespace for user-supplied knowledge metadata.
 * Prevents a learner's save payload from modifying or occupying a shared
 * catalogue key. Existing shared catalogue rows remain immutable.
 */
export async function privateKnowledgeItemKey(userId: number, originalKey: string) {
  if (!Number.isSafeInteger(userId) || userId <= 0)
    throw new Error("Invalid authenticated user");
  if (!originalKey || originalKey.length > 180)
    throw new Error("Invalid item key");
  const input = new TextEncoder().encode(`${userId}\u0000${originalKey}`);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return `learner:${Array.from(bytes, x => x.toString(16).padStart(2, "0")).join("")}`;
}
