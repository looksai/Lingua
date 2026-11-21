import {
  float,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const knowledgeItems = mysqlTable(
  "knowledgeItems",
  {
    id: int("id").autoincrement().primaryKey(),
    itemKey: varchar("itemKey", { length: 180 }).notNull().unique(),
    kind: mysqlEnum("kind", ["word", "phrase"]).notNull(),
    text: text("text").notNull(),
    normalizedText: varchar("normalizedText", { length: 255 }).notNull(),
    language: varchar("language", { length: 16 }).notNull(),
    translation: text("translation"),
    example: text("example"),
    pronunciation: text("pronunciation"),
    audioUrl: text("audioUrl"),
    sourceId: varchar("sourceId", { length: 120 }),
    sourceRecordId: varchar("sourceRecordId", { length: 180 }),
    license: varchar("license", { length: 255 }),
    curriculumAnchors: text("curriculumAnchors"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    normalizedTextIdx: index("knowledgeItems_normalizedText_idx").on(
      table.normalizedText
    ),
  })
);

export const userKnowledgeStates = mysqlTable(
  "userKnowledgeStates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    knowledgeItemId: int("knowledgeItemId").notNull(),
    state: mysqlEnum("state", ["new", "learning", "review", "relearning"])
      .notNull()
      .default("new"),
    easeFactor: float("easeFactor").notNull().default(2.5),
    intervalDays: int("intervalDays").notNull().default(0),
    repetitions: int("repetitions").notNull().default(0),
    lapses: int("lapses").notNull().default(0),
    dueAt: timestamp("dueAt").notNull().defaultNow(),
    lastReviewedAt: timestamp("lastReviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerItemUnique: unique("userKnowledgeStates_user_item_unique").on(
      table.userId,
      table.knowledgeItemId
    ),
    dueAtIdx: index("userKnowledgeStates_dueAt_idx").on(
      table.userId,
      table.dueAt
    ),
  })
);

export const reviewLogs = mysqlTable(
  "reviewLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    knowledgeItemId: int("knowledgeItemId").notNull(),
    operationId: varchar("operationId", { length: 180 }).notNull(),
    rating: mysqlEnum("rating", ["again", "hard", "good", "easy"]).notNull(),
    quality: int("quality").notNull(),
    previousState: mysqlEnum("previousState", [
      "new",
      "learning",
      "review",
      "relearning",
    ]).notNull(),
    nextState: mysqlEnum("nextState", [
      "new",
      "learning",
      "review",
      "relearning",
    ]).notNull(),
    previousDueAt: timestamp("previousDueAt").notNull(),
    nextDueAt: timestamp("nextDueAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userOperationUnique: unique("reviewLogs_user_operation_unique").on(
      table.userId,
      table.operationId
    ),
    userCreatedIdx: index("reviewLogs_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = typeof knowledgeItems.$inferInsert;
export type UserKnowledgeState = typeof userKnowledgeStates.$inferSelect;
export type ReviewLog = typeof reviewLogs.$inferSelect;
