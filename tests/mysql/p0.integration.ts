import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { recordKnowledgeReview, reconstructPersistedKnowledgeState, upsertKnowledgeItem, ensureUserKnowledgeState, removeUserKnowledgeItem } from "../../server/db";
import { createInitialReviewState, applySrsReview, replayReviewLogs } from "../../shared/learning";

const url = process.env.DATABASE_URL ?? "";
const parsed = new URL(url || "mysql://invalid/invalid");
if (process.env.LINGUA_MYSQL_TEST !== "1" || parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/lingua_p0_test" || parsed.username !== "lingua_test" ||
    parsed.password !== "disposable-test-only" || !parsed.port)
  throw new Error("Refusing to run against anything except the disposable loopback test service");

let connection: Awaited<ReturnType<typeof mysql.createConnection>>;
async function migration(name: string) {
  const sql = readFileSync(new URL("../../drizzle/" + name, import.meta.url), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) await connection.query(statement);
  }
}
async function scalar(sql: string, params: (string|number)[] = []) {
  const [rows] = await connection.query<RowDataPacket[]>(sql, params);
  return Number(Object.values(rows[0])[0]);
}
const item = (key: string) => ({
  itemKey: key, kind: "word" as const, text: "ready", normalizedText: "ready", language: "en",
});
async function fixture(key: string, user = 101) {
  const k = await upsertKnowledgeItem(user, item(key));
  await ensureUserKnowledgeState(user, k.id);
  return k.id;
}
beforeAll(async () => {
  connection = await mysql.createConnection(url);
  const count = await scalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()");
  expect(count).toBe(0);
  await migration("0000_initial_users.sql");
  await migration("0001_great_maggott.sql");
  // A synthetic pre-P0 record exercises the legacy backfill before 0002.
  await connection.query("INSERT INTO users (id,openId) VALUES (101,'test-a'),(202,'test-b')");
  await connection.query("INSERT INTO knowledgeItems (id,itemKey,kind,text,normalizedText,language) VALUES (900,'legacy-fixture','word','legacy','legacy','en')");
  await connection.query("INSERT INTO userKnowledgeStates (userId,knowledgeItemId,state) VALUES (101,900,'learning')");
  await connection.query("INSERT INTO reviewLogs (userId,knowledgeItemId,rating,quality,previousState,nextState,previousDueAt,nextDueAt) VALUES (101,900,'good',4,'new','learning',NOW(),NOW())");
  await migration("0002_p0_review_idempotency.sql");
});
afterAll(async () => { if (connection) await connection.end(); });

describe("P0 actual MySQL 8", () => {
  it("backfills legacy IDs but does not fabricate provenance", async () => {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT * FROM reviewLogs WHERE knowledgeItemId=900");
    expect(rows[0].operationId).toBe("legacy-" + rows[0].id);
    expect(rows[0].stateId).toBeNull();
    expect(rows[0].resultJson).toBeNull();
    await expect(reconstructPersistedKnowledgeState(101,900)).rejects.toThrow(/legacy/);
  });
  it("serializes identical simultaneous operations and returns the original ACK", async () => {
    const id = await fixture("duplicate");
    const result = await Promise.all(Array.from({ length: 5 }, () => recordKnowledgeReview(101,id,"good","same-op-0001")));
    result.forEach(ack => expect(ack).toEqual(result[0]));
    expect(await scalar("SELECT COUNT(*) FROM reviewLogs WHERE userId=101 AND knowledgeItemId=?", [id])).toBe(1);
    await expect(recordKnowledgeReview(101,id,"easy","same-op-0001")).rejects.toThrow(/different review intent/);
    const rebuilt = await reconstructPersistedKnowledgeState(101,id);
    expect(rebuilt.equivalent).toBe(true);
    expect(rebuilt.reviews).toBe(1);
  });
  it("serializes distinct concurrent reviews without losing updates", async () => {
    const id = await fixture("concurrent");
    await Promise.all([recordKnowledgeReview(101,id,"good","parallel-0001"),recordKnowledgeReview(101,id,"good","parallel-0002")]);
    const rebuilt = await reconstructPersistedKnowledgeState(101,id);
    expect(rebuilt.reviews).toBe(2);
    expect(rebuilt.equivalent).toBe(true);
    expect(rebuilt.reconstructed.repetitions).toBe(2);
  });
  it("isolates account and item lifecycles", async () => {
    const id = await fixture("cycle");
    const other = await fixture("cycle",202);
    expect(other).not.toBe(id);
    await recordKnowledgeReview(101,id,"good","cycle-op-0001");
    await recordKnowledgeReview(202,other,"good","cycle-op-0001");
    await removeUserKnowledgeItem(101,id);
    await ensureUserKnowledgeState(101,id);
    await recordKnowledgeReview(101,id,"again","cycle-op-0002");
    const rebuilt = await reconstructPersistedKnowledgeState(101,id);
    expect(rebuilt.reviews).toBe(1);
    expect(rebuilt.equivalent).toBe(true);
    expect((await reconstructPersistedKnowledgeState(202,other)).reviews).toBe(1);
  });
  it("does not let a learner rewrite a global catalogue row", async () => {
    await connection.query("INSERT INTO knowledgeItems (itemKey,kind,text,normalizedText,language) VALUES ('global-test','word','original','original','en')");
    const personal = await upsertKnowledgeItem(101,{...item("global-test"),text:"changed"});
    expect(personal.itemKey).not.toBe("global-test");
    const [rows] = await connection.query<RowDataPacket[]>("SELECT text FROM knowledgeItems WHERE itemKey='global-test'");
    expect(rows[0].text).toBe("original");
  });
  it("replays the corrected final hard and repairs an altered derived state only on explicit write", async () => {
    const id = await fixture("final-hard");
    await recordKnowledgeReview(101,id,"good","hard-op-0001");
    await recordKnowledgeReview(101,id,"good","hard-op-0002");
    const ack = await recordKnowledgeReview(101,id,"hard","hard-op-0003");
    expect(ack.state).toBe("review");
    expect(ack.intervalDays).toBe(1);
    expect((await reconstructPersistedKnowledgeState(101,id)).equivalent).toBe(true);
    await connection.query("UPDATE userKnowledgeStates SET intervalDays=99 WHERE userId=101 AND knowledgeItemId=?", [id]);
    expect((await reconstructPersistedKnowledgeState(101,id)).written).toBe(false);
    expect((await reconstructPersistedKnowledgeState(101,id,true)).written).toBe(true);
    expect((await reconstructPersistedKnowledgeState(101,id)).equivalent).toBe(true);
  });
});

describe("SRS normative change", () => {
  it("promotes only the final learning hard; historical replay preserves the previous behavior", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const initial = createInitialReviewState("7",now);
    const short = {...initial,state:"learning" as const,repetitions:1};
    const last = {...short,repetitions:2};
    expect(applySrsReview(short,"hard",now).repetitions).toBe(1);
    expect(applySrsReview(last,"hard",now).state).toBe("review");
    expect(applySrsReview(last,"hard",now).intervalDays).toBe(1);
    expect(applySrsReview(last,"easy",now).intervalDays).toBe(4);
    expect(applySrsReview(last,"again",now).repetitions).toBe(0);
    expect(replayReviewLogs("7",[{knowledgeItemId:"7",rating:"hard",createdAt:now.toISOString(),legacyFinalHard:true}],last).state).toBe("learning");
  });
});
