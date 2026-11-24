/** Staging-only billing rules; tutor admission is implemented in tutor-entitlement.ts.
 * Entitlements must be derived on the server from verified subscription state.
 */
export const TRIAL_HOURS = 72;
export const TRIAL_SUCCESSFUL_REPLY_LIMIT = 20;

export type SubscriptionView = {
  status: string;
  stripePriceId: string;
  currentPeriodEnd: Date | null;
  paidThroughAt: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type TrialView = {
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  successfulReplies: number;
};

export function premiumAllowed(
  subscriptions: readonly SubscriptionView[],
  permittedPriceIds: ReadonlySet<string>,
  now: Date,
): boolean {
  const time=now.getTime();
  if (!Number.isFinite(time) || !permittedPriceIds.size) return false;
  return subscriptions.some(s =>
    s.status==="active" &&
    permittedPriceIds.has(s.stripePriceId) &&
    s.currentPeriodEnd instanceof Date &&
    s.paidThroughAt instanceof Date &&
    s.currentPeriodEnd.getTime() > time &&
    s.paidThroughAt.getTime() > time
  );
}

export function trialAllowsNewChat(
  trial: TrialView | null, now: Date,
): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  if (!trial) return true; // Trial clock starts at first successful AI reply, not signup.
  if (!Number.isSafeInteger(trial.successfulReplies) ||
      trial.successfulReplies < 0 ||
      trial.successfulReplies >= TRIAL_SUCCESSFUL_REPLY_LIMIT) return false;
  if (trial.trialStartedAt===null && trial.trialEndsAt===null) return true;
  if (!(trial.trialStartedAt instanceof Date) || !(trial.trialEndsAt instanceof Date)) return false;
  const start=trial.trialStartedAt.getTime(), end=trial.trialEndsAt.getTime();
  return Number.isFinite(start) && Number.isFinite(end) &&
    end-start===TRIAL_HOURS*60*60*1000 && now.getTime()<end && now.getTime()>=start;
}

/** The actual quota reservation must use an atomic DB transaction and a
 * unique interactionId; this read-only function NEVER issues a reservation.
 */
export function paidOrTrial(
  subscriptions: readonly SubscriptionView[],
  permittedPriceIds: ReadonlySet<string>,
  trial: TrialView | null,
  now: Date,
): "premium" | "trial" | "blocked" {
  if (premiumAllowed(subscriptions, permittedPriceIds, now)) return "premium";
  return trialAllowsNewChat(trial, now) ? "trial" : "blocked";
}

export function billingFeatureEnabled(env=process.env): boolean {
  return env.STRIPE_BILLING_ENABLED==="true";
}
