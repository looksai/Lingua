/** Manual, guarded Aiven staging bootstrap. Run ONLY via GitHub workflow_dispatch.
 * GitHub Secrets hold the NEW rotated DATABASE_URL and project CA Base64.
 * Writes are impossible in inspect mode, and migrate refuses non-empty DBs.
 */
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, mayMigrate, STAGING_SCHEMA } from "./staging-aiven-guard";

const names = [
  "0000_initial_users.sql",
  "0001_great_maggott.sql",
  "0002_p0_review_idempotency.sql",
] as const;

async function main() {
  const action = process.env.LINGUA_STAGING_ACTION ?? "inspect";
  if (action !== "inspect" && action !== "migrate")
    throw new Error("Invalid action");
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      process.env.GITHUB_REF !== "refs/heads/main")
    throw new Error("Run this procedure manually from main only");

  const url = process.env.LINGUA_STAGING_DATABASE_URL;
  const ca = process.env.LINGUA_STAGING_CA_BASE64;
  if (!url || !ca) throw new Error("Staging GitHub Secrets not configured");
  assertStagingTarget(url);
  const options = buildMysqlPoolOptions(url, ca);
  const connection = await mysql.createConnection({
    ...options,
    connectTimeout: 15000,
    multipleStatements: false,
  });
  let lockAcquired = false;
  try {
    const [test] = await connection.query<RowDataPacket[]>(
      "SELECT 1 AS ok, VERSION() AS version, DATABASE() AS db"
    );
    if (Number(test[0]?.ok) !== 1 || test[0]?.db !== STAGING_SCHEMA)
      throw new Error("Database identity check failed");
    const version = String(test[0].version);
    if (!version.startsWith("8.4."))
      throw new Error("Unexpected MySQL version; verify before migration");

    const [ssl] = await connection.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if (!String(ssl[0]?.Value ?? "")) throw new Error("Session TLS cipher missing");
    const [tableRows] = await connection.execute<RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name"
    );
    const existingTables = tableRows.map(row => String(row.name));
    console.log("Staging MySQL 8.4 TLS verified; table count:", existingTables.length);
    console.log("Current table names:", existingTables.join(", ") || "(empty)");

    if (!mayMigrate(action, process.env.LINGUA_STAGING_CONFIRMATION ?? "",
      existingTables, process.env.GITHUB_REF, process.env.GITHUB_EVENT_NAME)) {
      console.log("READ-ONLY INSPECTION COMPLETE; no schema changes");
      return;
    }

    const [locked] = await connection.execute<RowDataPacket[]>(
      "SELECT GET_LOCK('lingua_staging_schema_bootstrap', 15) AS acquired"
    );
    if (Number(locked[0]?.acquired) !== 1) throw new Error("Schema lock unavailable");
    lockAcquired = true;
    // Second check under advisory lock. DDL auto-commits in MySQL:
    // partial failure requires manual reconciliation; never blindly retry.
    const [still] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    if (Number(still[0]?.n) !== 0)
      throw new Error("Schema changed during inspection; refusing bootstrap");

    for (const name of names) {
      const sql = readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8");
      const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log("Applied migration:", name);
    }
    const [confirmed] = await connection.execute<RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    const known = new Set(confirmed.map(row => String(row.name)));
    for (const name of ["users","knowledgeItems","reviewLogs","userKnowledgeStates"])
      if (!known.has(name)) throw new Error("Missing table after migration");
    const [indices] = await connection.query<RowDataPacket[]>(
      "SHOW INDEX FROM `reviewLogs` WHERE Key_name = 'reviewLogs_user_operation_unique'"
    );
    if (indices.length !== 2)
      throw new Error("P0 idempotency unique index not confirmed");
    console.log("Staging bootstrap and index verification successful; no learner data seeded");
  } finally {
    if (lockAcquired) {
      try { await connection.execute("SELECT RELEASE_LOCK('lingua_staging_schema_bootstrap')"); }
      catch { /* lock released when connection closes */ }
    }
    await connection.end();
  }
}
main().catch(error => {
  // Do not expose host credentials, connection strings or raw driver payloads.
  console.error("Staging step failed:", error instanceof Error ? error.message.replace(/mysql:\/\/\S+/g,"[REDACTED_URL]") : "unknown error");
  process.exitCode = 1;
});
