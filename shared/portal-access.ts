/**
 * Portal access policy — pure decision layer, never a substitute for server
 * authentication. Caller MUST load grants from trusted server-owned records.
 * Login, referrals, promo codes and partner subscriptions confer no member
 * permissions by themselves.
 */
export type PortalGrant = {
  kind: "academy" | "club";
  state: "active" | "revoked" | "expired";
  expiresAtMs: number | null; // null only for genuinely permanent Club grants
  source: "subscription" | "purchase" | "loyalty" | "staff";
};
export type PortalOperation =
  | "read-public"
  | "read-private"
  | "reply-in-private"
  | "create-private-topic"
  | "manage-group"
  | "view-partner-directory";

export type PortalAccessInput = {
  authenticated: boolean;
  grants: readonly PortalGrant[];
  nowMs: number;
  /** Must be a server-assigned role, never a profile label or public claim. */
  communityRole?: "member" | "moderator";
  /** Academy members access only groups deliberately opened to them. */
  academyGroupAllowed?: boolean;
};

export function hasPortalGrant(input: PortalAccessInput, kind: PortalGrant["kind"]): boolean {
  if (!input.authenticated || !Number.isFinite(input.nowMs)) return false;
  return input.grants.some(grant =>
    grant.kind === kind &&
    grant.state === "active" &&
    (grant.expiresAtMs === null
      ? kind === "club" && (grant.source === "purchase" || grant.source === "loyalty" || grant.source === "staff")
      : Number.isFinite(grant.expiresAtMs) && grant.expiresAtMs > input.nowMs)
  );
}

export function canUsePortal(input: PortalAccessInput, action: PortalOperation): boolean {
  if (action === "read-public" || action === "view-partner-directory") return true;
  const club=hasPortalGrant(input, "club");
  const academy=hasPortalGrant(input, "academy") && input.academyGroupAllowed === true;
  if (action === "read-private" || action === "reply-in-private") return club || academy;
  if (action === "create-private-topic") return club;
  if (action === "manage-group")
    return club && input.communityRole === "moderator";
  return false;
}
