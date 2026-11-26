/**
 * Pure authorization boundary for the future subscription community.
 * Entitlements MUST be loaded server-side from an authoritative billing
 * adapter. Never accept this object from request inputs or client state.
 * Not wired into any router yet; no production access is granted.
 */
export type CommunityEntitlement = {
  userId: number;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled" | "unpaid";
  validUntilMs: number;
};

export type CommunityAccess =
  | { allowed: true }
  | { allowed: false; reason: "disabled" | "authentication_required" | "subscription_required" };

export function evaluateCommunityAccess(input: {
  featureEnabled: boolean;
  authenticatedUserId: number | null;
  entitlement: CommunityEntitlement | null;
  nowMs: number;
}): CommunityAccess {
  if (input.featureEnabled !== true) return { allowed: false, reason: "disabled" };
  const userId = input.authenticatedUserId;
  if (userId === null || !Number.isSafeInteger(userId) || userId <= 0)
    return { allowed: false, reason: "authentication_required" };
  const entitlement = input.entitlement;
  if (
    !entitlement ||
    entitlement.userId !== userId ||
    entitlement.status !== "active" ||
    !Number.isSafeInteger(input.nowMs) ||
    input.nowMs < 0 ||
    !Number.isSafeInteger(entitlement.validUntilMs) ||
    entitlement.validUntilMs <= input.nowMs
  ) return { allowed: false, reason: "subscription_required" };
  return { allowed: true };
}
