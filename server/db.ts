import { and, asc, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { buildMysqlPoolOptions } from "./mysql-pool-options";
import {
  InsertKnowledgeItem,
  InsertUser,
  knowledgeItems,
  reviewLogs,
  userKnowledgeStates,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { privateKnowledgeItemKey } from "./knowledge-ownership";
import {
  applySrsReview,
  createInitialReviewState,
  replayReviewLogs,
  type SrsRating,
  type ReviewResult,
} from "../shared/learning";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const options = buildMysqlPoolOptions(
        process.env.DATABASE_URL, process.env.DATABASE_SSL_CA_BASE64
      );
      _db = drizzle({ client: mysql.createPool(options) });
    } catch (error) {
      console.warn("[Database] Initialization failed; connection settings or TLS need review");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertKnowledgeItem(userId: number, item: InsertKnowledgeItem) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  // Content supplied by a learner receives a private, server-derived key.
  // It can neither overwrite nor pre-claim the shared catalogue namespace.
  const scopedItem: InsertKnowledgeItem = { ...item, itemKey: await privateKnowledgeItemKey(userId, item.itemKey) };
  // Shared catalogue content is immutable from learner-facing save requests.
  // Duplicate keys only attach an existing item to this learner; they NEVER
  // rewrite translation, licence, provenance, source or curriculum metadata.
  await db.insert(knowledgeItems).values(scopedItem).onDuplicateKeyUpdate({
    set: { itemKey: scopedItem.itemKey },
  });

  const rows = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.itemKey, scopedItem.itemKey))
    .limit(1);
  return rows[0];
}

export async function ensureUserKnowledgeState(
  userId: number,
  knowledgeItemId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select()
    .from(userKnowledgeStates)
    .where(
      and(
        eq(userKnowledgeStates.userId, userId),
        eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)
      )
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const initial = createInitialReviewState(String(knowledgeItemId));
  await db.insert(userKnowledgeStates).values({
    userId,
    knowledgeItemId,
    state: initial.state,
    easeFactor: initial.easeFactor,
    intervalDays: initial.intervalDays,
    repetitions: initial.repetitions,
    lapses: initial.lapses,
    dueAt: new Date(initial.dueAt),
  }).onDuplicateKeyUpdate({
    set: { userId }, // no-op when another save won the race
  });
  const created = await db
    .select()
    .from(userKnowledgeStates)
    .where(
      and(
        eq(userKnowledgeStates.userId, userId),
        eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)
      )
    )
    .limit(1);
  return created[0];
}

export async function listReviewQueue(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({ item: knowledgeItems, state: userKnowledgeStates })
    .from(userKnowledgeStates)
    .innerJoin(
      knowledgeItems,
      eq(userKnowledgeStates.knowledgeItemId, knowledgeItems.id)
    )
    .where(
      and(
        eq(userKnowledgeStates.userId, userId),
        lte(userKnowledgeStates.dueAt, new Date())
      )
    )
    .orderBy(asc(userKnowledgeStates.dueAt))
    .limit(limit);
}

export async function listUserKnowledgeItems(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const query = db
    .select({ item: knowledgeItems, state: userKnowledgeStates })
    .from(userKnowledgeStates)
    .innerJoin(
      knowledgeItems,
      eq(userKnowledgeStates.knowledgeItemId, knowledgeItems.id)
    )
    .where(eq(userKnowledgeStates.userId, userId))
    .orderBy(asc(userKnowledgeStates.dueAt));
  return limit ? query.limit(limit) : query;
}

export async function removeUserKnowledgeItem(
  userId: number,
  knowledgeItemId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(userKnowledgeStates)
    .where(
      and(
        eq(userKnowledgeStates.userId, userId),
        eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)
      )
    );
}

export async function listReviewHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      logId: reviewLogs.id,
      knowledgeItemId: reviewLogs.knowledgeItemId,
      text: knowledgeItems.text,
      rating: reviewLogs.rating,
      quality: reviewLogs.quality,
      previousState: reviewLogs.previousState,
      nextState: reviewLogs.nextState,
      createdAt: reviewLogs.createdAt,
    })
    .from(reviewLogs)
    .innerJoin(
      knowledgeItems,
      eq(reviewLogs.knowledgeItemId, knowledgeItems.id)
    )
    .where(eq(reviewLogs.userId, userId))
    .orderBy(desc(reviewLogs.createdAt))
    .limit(limit);
}

// No DB-backed invocation of this function is permitted without an operationId.
// A replay with the same ID and different intent is a conflict, not a success.
export async function recordKnowledgeReview(
  userId: number,
  knowledgeItemId: number,
  rating: SrsRating,
  operationId: string
): Promise<ReviewResult> {
  if (!/^[A-Za-z0-9_-]{8,180}$/.test(operationId))
    throw new Error("Invalid operationId");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existingResult = async (connection: typeof db): Promise<ReviewResult | undefined> => {
    const found = await connection.select().from(reviewLogs)
      .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.operationId, operationId)))
      .limit(1);
    if (!found[0]) return undefined;
    if (found[0].knowledgeItemId !== knowledgeItemId || found[0].rating !== rating)
      throw new Error("Operation ID reused with a different review intent");
    if (!found[0].resultJson)
      throw new Error("Legacy review has no retrievable idempotent result");
    const { srsRule: _rule, ...ack } = JSON.parse(found[0].resultJson) as ReviewResult & { srsRule?: string };
    return ack;
  };

  const prior = await existingResult(db);
  if (prior) return prior;
  try {
    return await db.transaction(async tx => {
      // Per learner+item row lock serializes competing reviews, including
      // the post-lock duplicate check (the ACK may have been lost).
      const rows = await tx.select().from(userKnowledgeStates)
        .where(and(
          eq(userKnowledgeStates.userId, userId),
          eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)
        ))
        .limit(1).for("update");
      const afterLock = await existingResult(tx as unknown as typeof db);
      if (afterLock) return afterLock;
      const current = rows[0];
      if (!current) throw new Error("Review state not found");
      const now = new Date(Math.floor(Date.now() / 1000) * 1000);
      const result = applySrsReview(
        {
          knowledgeItemId: String(knowledgeItemId),
          state: current.state,
          easeFactor: current.easeFactor,
          intervalDays: current.intervalDays,
          repetitions: current.repetitions,
          lapses: current.lapses,
          dueAt: current.dueAt.toISOString(),
          lastReviewedAt: current.lastReviewedAt?.toISOString(),
        }, rating, now,
        { userId: String(userId), itemId: String(knowledgeItemId) }
      );
      const nextDueAt = new Date(result.dueAt);
      await tx.update(userKnowledgeStates).set({
        state: result.state,
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        lapses: result.lapses,
        dueAt: nextDueAt,
        lastReviewedAt: now,
        updatedAt: now,
      }).where(eq(userKnowledgeStates.id, current.id));
      await tx.insert(reviewLogs).values({
        userId, knowledgeItemId, operationId, stateId: current.id,
        appliedAtMs: now.getTime(), resultJson: JSON.stringify({ ...result, srsRule: "learning-final-hard-v2" }),
        rating, quality: result.quality,
        previousState: current.state, nextState: result.state,
        previousDueAt: current.dueAt, nextDueAt,
      });
      return result;
    });
  } catch (error) {
    // Cross-item concurrent reuse is rejected by the unique DB index.
    // If the transaction lost the race, return the ORIGINAL ACK only for
    // identical intent. Never turn a general DB failure into an ACK.
    const mysqlCode = (error as { code?: string; cause?: { code?: string } }).code ??
      (error as { cause?: { code?: string } }).cause?.code;
    if (mysqlCode === "ER_DUP_ENTRY") {
      const committed = await existingResult(db);
      if (committed) return committed;
    }
    throw error;
  }
}

/** Maintenance-only: rebuild the *current save lifecycle* from committed logs.
 * Legacy rows lacking cycle/timestamp provenance fail closed, never guessed.
 * This does not certify mastery and does not create new review logs.
 */
export async function reconstructPersistedKnowledgeState(
  userId: number, knowledgeItemId: number, write = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [current] = await tx.select().from(userKnowledgeStates)
      .where(and(eq(userKnowledgeStates.userId, userId),
        eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)))
      .limit(1).for("update");
    if (!current) throw new Error("No current learning lifecycle");
    const everyLog = await tx.select().from(reviewLogs)
      .where(and(eq(reviewLogs.userId, userId),
        eq(reviewLogs.knowledgeItemId, knowledgeItemId)))
      .orderBy(asc(reviewLogs.id));
    // We have no proof whether old (pre-migration) logs belong to the
    // current save cycle. Never silently reconstruct across removal.
    if (everyLog.some(log => log.stateId == null || log.appliedAtMs == null))
      throw new Error("Unattributable legacy reviews: manual reconciliation required");
    const currentLogs = everyLog.filter(log => log.stateId === current.id);
    if (!currentLogs.length && current.state !== "new")
      throw new Error("Current state has no attributable review history");
    const ordered = currentLogs.sort((a,b) =>
      (a.appliedAtMs! - b.appliedAtMs!) || a.id - b.id);
    if (ordered[0]?.previousState !== "new")
      throw new Error("First review is not anchored to a new state");
    const initial = createInitialReviewState(String(knowledgeItemId),
      ordered[0]?.previousDueAt ?? current.createdAt);
    const reconstructed = replayReviewLogs(String(knowledgeItemId),
      ordered.map(log => ({
        knowledgeItemId: String(knowledgeItemId), rating: log.rating,
        createdAt: new Date(log.appliedAtMs!).toISOString(),
        operationId: log.operationId, sequence: log.id,
        legacyFinalHard: !log.resultJson || JSON.parse(log.resultJson).srsRule !== "learning-final-hard-v2",
      })), initial, {
        userId: String(userId), itemId: String(knowledgeItemId), databaseFloat32: true,
      });
    const equivalent = reconstructed.state === current.state &&
      reconstructed.intervalDays === current.intervalDays &&
      reconstructed.repetitions === current.repetitions &&
      reconstructed.lapses === current.lapses &&
      Math.abs(reconstructed.easeFactor - current.easeFactor) <= 0.00001 &&
      Math.abs(new Date(reconstructed.dueAt).getTime() - current.dueAt.getTime()) <= 1000;
    if (write && !equivalent) {
      await tx.update(userKnowledgeStates).set({
        state: reconstructed.state, intervalDays: reconstructed.intervalDays,
        repetitions: reconstructed.repetitions, lapses: reconstructed.lapses,
        easeFactor: reconstructed.easeFactor,
        dueAt: new Date(reconstructed.dueAt),
        lastReviewedAt: reconstructed.lastReviewedAt ? new Date(reconstructed.lastReviewedAt) : null,
      }).where(eq(userKnowledgeStates.id, current.id));
    }
    return { equivalent, written: write && !equivalent,
      stateId: current.id, reviews: ordered.length, reconstructed };
  });
}
