/** Guarded, one-time MySQL 0007 staging migration.
 * `inspect` is read-only. `apply` requires explicit approval, operator-
 * confirmed backup, GitHub workflow_dispatch from main and verified TLS CA.
 * Never use db:push. A failure after DDL may leave a partial migration.
 */
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, STAGING_SCHEMA } from "./staging-aiven-guard";
import { signedIntUserIdColumn, describeUserIdColumn, memory0007CreateStatement } from "./staging-memory-0007-column";

const CONFIRM = "APLICAR_0007_MEMORIA_SOMENTE_LINGUA";
const BACKUP_CONFIRM = "BACKUP_AIVEN_CONFIRMADO";
const LOCK = "lingua_staging_schema_0007";

async function main() {
  const action = process.env.LINGUA_STAGING_ACTION || "inspect";
  if (!["inspect", "apply"].includes(action)) throw new Error("Unrecognized migration action");
  if (process.env.GITHUB_REF !== "refs/heads/main" || process.env.GITHUB_EVENT_NAME !== "workflow_dispatch")
    throw new Error("Manual workflow_dispatch from main is mandatory");

  const url = process.env.LINGUA_STAGING_DATABASE_URL;
  const ca = process.env.LINGUA_STAGING_CA_BASE64;
  if (!url || !ca) throw new Error("Staging connection secrets not configured");
  assertStagingTarget(url);

  const conn = await mysql.createConnection({
    ...buildMysqlPoolOptions(url, ca),
    connectTimeout: 15000,
    multipleStatements: false,
  });
  let locked = false;
  try {
    const [base] = await conn.query<RowDataPacket[]>("SELECT DATABASE() AS target, VERSION() AS version");
    if (base[0]?.target !== STAGING_SCHEMA || !String(base[0]?.version).startsWith("8.4."))
      throw new Error("Unexpected staging database or MySQL version");
    const [cipher] = await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if (!cipher[0]?.Value) throw new Error("Connection does not report TLS cipher");
    const [tables] = await conn.execute<RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    const present = new Set(tables.map(row => String(row.name)));
    for (const name of ["users", "localCredentials", "learnerProfiles", "introductoryResponses", "learnerPlacementAnswers", "learnerPlacementPlans"]) {
      if (!present.has(name)) throw new Error("Required prior-migration table missing: " + name);
    }
    // Explicit aliases are required: information_schema metadata may be returned
    // with uppercase COLUMN_NAME/DATA_TYPE/COLUMN_TYPE keys.
    const [userIdColumns] = await conn.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME AS columnName, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'"
    );
    const userIdInfo = userIdColumns.length===1 ? userIdColumns[0] : undefined;
    console.log("0007 signed FK preflight:", describeUserIdColumn(userIdInfo));
    if (!signedIntUserIdColumn(userIdInfo))
      throw new Error("users.id schema must be reviewed before migration");
    console.log("Verified Aiven staging / MySQL 8.4 / TLS / required 0005 + 0006 tables");
    console.log("learnerMemories status:", present.has("learnerMemories") ? "present" : "absent");

    if (action === "inspect") {
      console.log("READ-ONLY 0007 INSPECTION COMPLETED");
      return;
    }
    if (process.env.LINGUA_STAGING_CONFIRMATION !== CONFIRM ||
        process.env.LINGUA_STAGING_BACKUP_CONFIRMATION !== BACKUP_CONFIRM)
      throw new Error("Missing explicit 0007 and externally confirmed backup acknowledgements");
    if (present.has("learnerMemories"))
      throw new Error("0007 target already exists; refusing duplicate/repair execution");

    const [lockResult] = await conn.execute<RowDataPacket[]>("SELECT GET_LOCK(?, 15) AS acquired", [LOCK]);
    if (Number(lockResult[0]?.acquired) !== 1) throw new Error("Could not acquire schema migration lock");
    locked = true;
    const [check] = await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='learnerMemories'"
    );
    if (Number(check[0]?.total) !== 0) throw new Error("Concurrent schema change detected");

    const sql = readFileSync(new URL("../drizzle/0007_learner_memories.sql", import.meta.url), "utf8");
    await conn.query(memory0007CreateStatement(sql));

    const [columns] = await conn.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='learnerMemories'"
    );
    const actual = new Set(columns.map(row => String(row.name)));
    for (const name of ["id", "userId", "fato", "categoria", "origem", "factKey", "createdAt"])
      if (!actual.has(name)) throw new Error("Missing expected memory field after DDL: " + name);

    const [indexes] = await conn.query<RowDataPacket[]>("SHOW INDEX FROM `learnerMemories`");
    const keys = new Set(indexes.map(row => String(row.Key_name)));
    for (const name of ["PRIMARY", "learnerMemories_user_fact_unique", "learnerMemories_user_recent_idx"])
      if (!keys.has(name)) throw new Error("Expected memory index missing: " + name);
    const [foreignKey] = await conn.execute<RowDataPacket[]>(
      `SELECT k.COLUMN_NAME AS column_name, k.REFERENCED_TABLE_NAME AS target, r.DELETE_RULE AS delete_rule
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME
         WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME='learnerMemories' AND k.REFERENCED_TABLE_NAME IS NOT NULL`
    );
    if (foreignKey.length!==1 || foreignKey[0].column_name!=="userId" || foreignKey[0].target!=="users" || foreignKey[0].delete_rule!=="CASCADE")
      throw new Error("Memory foreign key validation failed");
    const [count] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM `learnerMemories`");
    if (Number(count[0]?.n)!==0) throw new Error("Unexpected initial memory count");
    console.log("0007 APPLIED AND VERIFIED: 7 fields, indexes, FK cascade, 0 initial rows");
    console.log("Existing student/SRS/CSLE tables were not modified by this migration");
  } finally {
    if (locked) {
      try { await conn.execute("SELECT RELEASE_LOCK(?)", [LOCK]); }
      catch { /* connection close releases the advisory lock */ }
    }
    await conn.end();
  }
}
main().catch(error => {
  // Never log raw database driver errors: they may contain SQL or connection data.
  const permitted = [
    "Manual workflow_dispatch from main is mandatory",
    "Unrecognized migration action",
    "Staging connection secrets not configured",
    "Unexpected staging database or MySQL version",
    "Connection does not report TLS cipher",
    "users.id schema must be reviewed before migration",
    "Missing explicit 0007 and externally confirmed backup acknowledgements",
    "0007 target already exists; refusing duplicate/repair execution",
    "Could not acquire schema migration lock",
    "Concurrent schema change detected",
    "Unexpected migration file; refusing execution",
    "Memory foreign key validation failed",
    "Unexpected initial memory count",
  ];
  const message = error instanceof Error ? error.message : "";
  console.error("Migration 0007 aborted:", permitted.includes(message) || message.startsWith("Required prior-migration table missing:") ||
    message.startsWith("Missing expected memory field after DDL:") || message.startsWith("Expected memory index missing:")
    ? message : "internal database error (details suppressed)");
  process.exitCode=1;
});
