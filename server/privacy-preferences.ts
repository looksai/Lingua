import { and, eq } from "drizzle-orm";
import { learnerPrivacyPreferences } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Account-scoped settings, never inferred from browser storage.
 * No row (legacy account) or DB outage is not an opt-in.
 */
export const PRIVACY_POLICY_VERSION = 1;

export async function readPrivacyPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("privacy preferences database unavailable");
  const [row] = await db.select({
    policyVersion: learnerPrivacyPreferences.policyVersion,
    serviceAcceptedAt: learnerPrivacyPreferences.serviceAcceptedAt,
    personalMemoryEnabled: learnerPrivacyPreferences.personalMemoryEnabled,
  }).from(learnerPrivacyPreferences)
    .where(eq(learnerPrivacyPreferences.userId, userId)).limit(1);
  if (!row) return { serviceAccepted: false, personalMemoryEnabled: false, legacyAccount: true };
  return {
    serviceAccepted: row.policyVersion === PRIVACY_POLICY_VERSION,
    personalMemoryEnabled: row.policyVersion === PRIVACY_POLICY_VERSION && row.personalMemoryEnabled === 1,
    legacyAccount: false,
  };
}

/** The learner must already have an accepted version; no implicit legacy upgrade. */
export async function changePersonalMemoryPreference(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("privacy preferences database unavailable");
  return db.transaction(async tx => {
    const [current] = await tx.select().from(learnerPrivacyPreferences)
      .where(eq(learnerPrivacyPreferences.userId, userId)).for("update").limit(1);
    if (!current || current.policyVersion !== PRIVACY_POLICY_VERSION)
      return { updated: false as const, reason: "service_not_accepted" as const };
    await tx.update(learnerPrivacyPreferences).set({
      personalMemoryEnabled: enabled ? 1 : 0,
      memoryUpdatedAt: new Date(),
    }).where(and(eq(learnerPrivacyPreferences.userId, userId),
      eq(learnerPrivacyPreferences.policyVersion, PRIVACY_POLICY_VERSION)));
    return { updated: true as const, enabled };
  });
}
