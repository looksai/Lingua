/** Additive migration for Lingua local auth. Never bootstraps or wipes existing schema. */
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, STAGING_SCHEMA } from "./staging-aiven-guard";

const CONFIRM = "APLICAR_0003_AUTH_LINGUA";
type Stage = "startup" | "connect" | "verify-identity" | "verify-tls" | "verify-prerequisites" | "acquire-lock" | "recheck-prerequisites" | "verify-index" | "apply-0003" | "verify-0003" | "release";
let stage: Stage = "startup";
function safeFailure(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  // Never print raw error messages, stack traces, SQL, URL, CA, or credentials.
  const safeCodes = new Set(["ER_PARSE_ERROR", "ER_TABLE_EXISTS_ERROR", "ER_NO_SUCH_TABLE", "ER_DUP_KEYNAME", "ER_CANNOT_ADD_FOREIGN", "ER_FK_INCOMPATIBLE_COLUMNS", "ER_ACCESS_DENIED_ERROR", "ER_LOCK_WAIT_TIMEOUT", "ER_BAD_FIELD_ERROR", "ECONNREFUSED", "ETIMEDOUT"]);
  console.error(`0003 failed at stage=${stage}; mysql_code=${safeCodes.has(code) ? code : "withheld"}; inspect schema before retrying.`);
}
async function main() {
  const action = process.env.LINGUA_STAGING_ACTION ?? "inspect";
  if (!["inspect", "migrate"].includes(action)) throw Error("Invalid action");
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" || process.env.GITHUB_REF !== "refs/heads/main") throw Error("Main manual dispatch only");
  const url = process.env.LINGUA_STAGING_DATABASE_URL;
  const ca = process.env.LINGUA_STAGING_CA_BASE64;
  if (!url || !ca) throw Error("Staging credentials unavailable");
  assertStagingTarget(url);
  stage = "connect";
  const conn = await mysql.createConnection({ ...buildMysqlPoolOptions(url, ca), multipleStatements: false, connectTimeout: 15000 });
  let locked = false;
  try {
    stage = "verify-identity";
    const [identity] = await conn.query<RowDataPacket[]>("SELECT DATABASE() AS db, VERSION() AS version");
    if (identity[0]?.db !== STAGING_SCHEMA || !String(identity[0]?.version).startsWith("8.4.")) throw Error("Unexpected database identity");
    stage = "verify-tls";
    const [ssl] = await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if (!String(ssl[0]?.Value ?? "")) throw Error("TLS session missing");
    stage = "verify-prerequisites";
    const [tables] = await conn.query<RowDataPacket[]>("SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE()");
    const existing = new Set(tables.map(row => String(row.name)));
    const required = ["users", "knowledgeItems", "userKnowledgeStates", "reviewLogs"];
    for (const name of required) if (!existing.has(name)) throw Error("Missing prerequisite table: " + name);
    if (existing.has("localCredentials")) {
      console.log("localCredentials already exists; no changes. Manual schema verification required if needed.");
      return;
    }
    if (action === "inspect") { console.log("Prerequisite tables found; localCredentials absent; inspection only."); return; }
    if (process.env.LINGUA_STAGING_CONFIRMATION !== CONFIRM) throw Error("Explicit 0003 confirmation required");
    stage = "acquire-lock";
    const [lock] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK('lingua_staging_schema_bootstrap',15) AS acquired");
    if (Number(lock[0]?.acquired) !== 1) throw Error("Schema lock unavailable");
    locked = true;
    stage = "recheck-prerequisites";
    const [again] = await conn.query<RowDataPacket[]>("SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE()");
    const fresh = new Set(again.map(row => String(row.name)));
    for (const name of required) if (!fresh.has(name)) throw Error("Prerequisite changed");
    if (fresh.has("localCredentials")) throw Error("Credentials table appeared concurrently");
    stage = "verify-index";
    const [index] = await conn.query<RowDataPacket[]>("SHOW INDEX FROM `reviewLogs` WHERE Key_name = 'reviewLogs_user_operation_unique'");
    if (index.length !== 2) throw Error("Prerequisite 0002 index missing");
    stage = "apply-0003";
    const sql = readFileSync(new URL("../drizzle/0003_local_credentials.sql", import.meta.url), "utf8");
    await conn.query(sql);
    stage = "verify-0003";
    const [verified] = await conn.query<RowDataPacket[]>("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='localCredentials'");
    if (verified.length !== 1) throw Error("0003 verification failed");
    console.log("0003 local credentials table created and verified.");
  } finally {
    if (locked) { try { await conn.query("SELECT RELEASE_LOCK('lingua_staging_schema_bootstrap')"); } catch {} }
    await conn.end();
  }
}
main().catch(error => { safeFailure(error); process.exitCode = 1; });
