/** Additive first-contact onboarding tables for the pinned Aiven staging DB.
 * No schema write without main/manual workflow dispatch and exact confirmation.
 * Supports partial DDL retry only after verifying existing table shape.
 */
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket, type Connection } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, STAGING_SCHEMA } from "./staging-aiven-guard";

const CONFIRM = "APLICAR_0004_ALUNO_LINGUA";
const LOCK = "lingua_staging_schema_bootstrap";
const REQUIRED = ["users", "localCredentials", "knowledgeItems", "userKnowledgeStates", "reviewLogs"];
const expected = {
  learnerProfiles: {
    columns: ["userId", "displayName", "studyGoal", "priorExposure", "baselineScore", "baselineTotal", "baselineCompletedAt", "createdAt", "updatedAt"],
    primary: ["userId"],
  },
  learnerLessonResults: {
    columns: ["userId", "lessonKey", "bestScore", "total", "completedAt", "updatedAt"],
    primary: ["userId", "lessonKey"],
  },
} as const;
let stage = "preflight";

function safeError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const allowed = new Set(["ER_PARSE_ERROR", "ER_TABLE_EXISTS_ERROR", "ER_CANNOT_ADD_FOREIGN", "ER_FK_INCOMPATIBLE_COLUMNS", "ER_ACCESS_DENIED_ERROR", "ER_LOCK_WAIT_TIMEOUT", "ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE", "ETIMEDOUT"]);
  console.error("0004 failed stage=" + stage + "; mysql_code=" + (allowed.has(code) ? code : "withheld") + ". No SQL or credentials logged.");
}

async function tableNames(conn: Connection): Promise<Set<string>> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE()"
  );
  return new Set(rows.map(row => String(row.name)));
}

async function verifyTable(conn: Connection, table: keyof typeof expected) {
  const [columns] = await conn.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS col FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
    [table]
  );
  const actual = new Set(columns.map(row => String(row.col)));
  if (columns.length !== expected[table].columns.length ||
      expected[table].columns.some(col => !actual.has(col)))
    throw new Error("Existing onboarding table has unexpected columns");
  const [keys] = await conn.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS col FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX",
    [table]
  );
  if (keys.length !== expected[table].primary.length ||
      expected[table].primary.some((col, i) => keys[i]?.col !== col))
    throw new Error("Existing onboarding table has unexpected primary key");
  const [references] = await conn.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS col FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND REFERENCED_TABLE_NAME='users' AND REFERENCED_COLUMN_NAME='id'",
    [table]
  );
  if (!references.some(row => row.col === "userId")) throw new Error("Missing learner table owner FK");
}

async function main() {
  const action = process.env.LINGUA_STAGING_ACTION ?? "inspect";
  if (action !== "inspect" && action !== "migrate") throw new Error("Invalid action");
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Main manual dispatch only");
  const url = process.env.LINGUA_STAGING_DATABASE_URL;
  const ca = process.env.LINGUA_STAGING_CA_BASE64;
  if (!url || !ca) throw new Error("Staging credentials unavailable");
  assertStagingTarget(url);

  stage = "connect";
  const conn = await mysql.createConnection({
    ...buildMysqlPoolOptions(url, ca), multipleStatements: false, connectTimeout: 15000
  });
  let locked = false;
  try {
    stage = "verify-identity";
    const [identity] = await conn.query<RowDataPacket[]>("SELECT DATABASE() AS db, VERSION() AS version");
    if (identity[0]?.db !== STAGING_SCHEMA || !String(identity[0]?.version).startsWith("8.4."))
      throw new Error("Unexpected database identity");
    const [ssl] = await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if (!String(ssl[0]?.Value ?? "")) throw new Error("TLS session missing");

    stage = "inspect-prerequisites";
    let names = await tableNames(conn);
    if (REQUIRED.some(table => !names.has(table))) throw new Error("Missing prerequisite tables");
    for (const table of Object.keys(expected) as (keyof typeof expected)[]) {
      if (names.has(table)) await verifyTable(conn, table);
    }
    if (action === "inspect") {
      console.log("0004 inspection only; prerequisites ok; learnerProfiles=" +
        (names.has("learnerProfiles") ? "verified" : "absent") +
        "; learnerLessonResults=" + (names.has("learnerLessonResults") ? "verified" : "absent"));
      return;
    }
    if (process.env.LINGUA_STAGING_CONFIRMATION !== CONFIRM)
      throw new Error("Explicit 0004 confirmation required");

    stage = "acquire-lock";
    const [lock] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK(?, 15) AS acquired", [LOCK]);
    if (Number(lock[0]?.acquired) !== 1) throw new Error("Schema lock unavailable");
    locked = true;
    stage = "recheck";
    names = await tableNames(conn);
    if (REQUIRED.some(table => !names.has(table))) throw new Error("Missing prerequisites after lock");

    const sql = readFileSync(new URL("../drizzle/0004_learner_onboarding.sql", import.meta.url), "utf8");
    const statements = sql.split("--> statement-breakpoint").map(part => part.trim()).filter(Boolean);
    if (statements.length !== 2) throw new Error("Unexpected migration statement count");
    const tables = Object.keys(expected) as (keyof typeof expected)[];
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!names.has(table)) {
        stage = "create-" + table;
        await conn.query(statements[i]);
        names.add(table);
      }
      stage = "verify-" + table;
      await verifyTable(conn, table);
    }
    console.log("0004 learnerProfiles and learnerLessonResults created/verified. No demo progress imported.");
  } finally {
    if (locked) {
      try { await conn.query("SELECT RELEASE_LOCK(?)", [LOCK]); } catch { /* no secret logging */ }
    }
    await conn.end();
  }
}
main().catch(error => { safeError(error); process.exitCode = 1; });
