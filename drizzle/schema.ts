import {
  bigint,
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

export const localCredentials = mysqlTable("localCredentials", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
    stateId: int("stateId"), // learning lifecycle; never replay a previous save-cycle
    appliedAtMs: bigint("appliedAtMs", { mode: "number" }), // precise authoritative server time
    resultJson: text("resultJson"), // exactly the committed ACK for idempotent retries
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


/**
 * Learner onboarding is deliberately separate from SRS knowledge states.
 * Do not treat the introductory answers as proof of mastery.
 */
export const learnerProfiles = mysqlTable("learnerProfiles", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  interfaceLocale: varchar("interfaceLocale", { length: 16 }).notNull().default("pt-BR"),
  nativeLanguage: varchar("nativeLanguage", { length: 16 }).notNull().default("pt"),
  targetLanguage: varchar("targetLanguage", { length: 16 }).notNull().default("en"),
  tutorName: varchar("tutorName", { length: 40 }).notNull().default("Seu tutor"),
  tutorPersona: mysqlEnum("tutorPersona", ["welcoming", "direct", "curious", "neutral"]).notNull().default("welcoming"),
  interest: mysqlEnum("interest", ["curiosity", "travel", "work", "technology", "everyday"]).notNull().default("curiosity"),
  allowAIFeedback: int("allowAIFeedback").notNull().default(0),
  onboardingStatus: mysqlEnum("onboardingStatus", ["started", "deferred", "complete"]).notNull().default("started"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const introductoryResponses = mysqlTable("introductoryResponses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("taskId", { length: 64 }).notNull(),
  answer: text("answer").notNull(),
  tutorReply: varchar("tutorReply", { length: 400 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userTaskUnique: unique("introductoryResponses_user_task_unique").on(table.userId, table.taskId),
}));

/**
 * Optional, learner-approved conversational memories. Never official pedagogy,
 * learning evidence or SRS; only explicit learner-confirmed quotes are stored.
 */
export const learnerMemories = mysqlTable("learnerMemories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fato: varchar("fato", { length: 240 }).notNull(),
  categoria: mysqlEnum("categoria", ["profissao", "objetivo", "interesse", "preferencia_estudo"]).notNull(),
  origem: varchar("origem", { length: 64 }).notNull().default("aluno_confirmou_no_chat"),
  factKey: varchar("factKey", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  uniqueFact: unique("learnerMemories_user_fact_unique").on(table.userId, table.factKey),
  recentByUser: index("learnerMemories_user_recent_idx").on(table.userId, table.createdAt, table.id),
}));
export type LearnerMemory = typeof learnerMemories.$inferSelect;

export type LearnerProfile = typeof learnerProfiles.$inferSelect;
export type IntroductoryResponse = typeof introductoryResponses.$inferSelect;


/**
 * P1 staging: optional preliminary writing observations and noncertifying plan.
 * Explicitly NOT the official competency evidence store or SRS state.
 * Requires reviewed 0006 migration BEFORE deploying this branch.
 */
export const learnerPlacementAnswers=mysqlTable("learnerPlacementAnswers",{
  id:int("id").autoincrement().primaryKey(),
  userId:int("userId").notNull().references(()=>users.id,{onDelete:"cascade"}),
  taskId:varchar("taskId",{length:40}).notNull(),
  answer:text("answer").notNull(),
  modality:mysqlEnum("modality",["text","asr_text"]).notNull().default("text"),
  createdAt:timestamp("createdAt").notNull().defaultNow(),
},table=>({userTaskUnique:unique("learnerPlacementAnswers_user_task_unique").on(table.userId,table.taskId)}));
export const learnerPlacementPlans=mysqlTable("learnerPlacementPlans",{
  userId:int("userId").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
  planJson:text("planJson").notNull(),
  source:mysqlEnum("source",["groq_suggestion","rule_based"]).notNull(),
  version:int("version").notNull().default(1),
  createdAt:timestamp("createdAt").notNull().defaultNow(),
  updatedAt:timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
