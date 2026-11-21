import { and, asc, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertKnowledgeItem,
  InsertUser,
  knowledgeItems,
  reviewLogs,
  userKnowledgeStates,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  applySrsReview,
  createInitialReviewState,
  type SrsRating,
} from "../shared/learning";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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

export async function upsertKnowledgeItem(item: InsertKnowledgeItem) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db
    .insert(knowledgeItems)
    .values(item)
    .onDuplicateKeyUpdate({
      set: {
        kind: item.kind,
        text: item.text,
        normalizedText: item.normalizedText,
        language: item.language,
        translation: item.translation ?? null,
        example: item.example ?? null,
        pronunciation: item.pronunciation ?? null,
        audioUrl: item.audioUrl ?? null,
        sourceId: item.sourceId ?? null,
        sourceRecordId: item.sourceRecordId ?? null,
        license: item.license ?? null,
        curriculumAnchors: item.curriculumAnchors ?? null,
        updatedAt: new Date(),
      },
    });

  const rows = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.itemKey, item.itemKey))
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

export async function recordKnowledgeReview(
  userId: number,
  knowledgeItemId: number,
  rating: SrsRating
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const rows = await tx
      .select()
      .from(userKnowledgeStates)
      .where(
        and(
          eq(userKnowledgeStates.userId, userId),
          eq(userKnowledgeStates.knowledgeItemId, knowledgeItemId)
        )
      )
      .limit(1);
    const current = rows[0];
    if (!current) throw new Error("Review state not found");
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
      },
      rating,
      new Date(),
      { userId: String(userId), itemId: String(knowledgeItemId) }
    );
    const nextDueAt = new Date(result.dueAt);
    await tx
      .update(userKnowledgeStates)
      .set({
        state: result.state,
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        lapses: result.lapses,
        dueAt: nextDueAt,
        lastReviewedAt: new Date(
          result.lastReviewedAt ?? new Date().toISOString()
        ),
        updatedAt: new Date(),
      })
      .where(eq(userKnowledgeStates.id, current.id));
    await tx.insert(reviewLogs).values({
      userId,
      knowledgeItemId,
      rating,
      quality: result.quality,
      previousState: current.state,
      nextState: result.state,
      previousDueAt: current.dueAt,
      nextDueAt,
    });
    return result;
  });
}
