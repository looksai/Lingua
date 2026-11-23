/** Prepare read-only, CA-verified MySQL 8.4 staging backup credentials for
 * a one-time mysqldump in GitHub Actions. Writes no student data, no SQL DDL.
 * Never print connection objects, secrets or raw database driver errors.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, STAGING_SCHEMA } from "./staging-aiven-guard";

export function mysqlOptionValue(value: string): string {
  if (!value || /[\u0000\r\n]/.test(value))
    throw new Error("Unsupported database option value");
  return '"' + value.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
}

async function main() {
  if (process.env.GITHUB_REF !== "refs/heads/main" ||
      process.env.GITHUB_EVENT_NAME !== "workflow_dispatch")
    throw new Error("Only manual main branch workflow is allowed");
  const url = process.env.LINGUA_STAGING_DATABASE_URL;
  const ca = process.env.LINGUA_STAGING_CA_BASE64;
  const tmp = process.env.RUNNER_TEMP;
  if (!url || !ca || !tmp) throw new Error("Missing staging backup prerequisites");
  assertStagingTarget(url);
  const options = buildMysqlPoolOptions(url, ca);
  const caPem = options.ssl && typeof options.ssl === "object" && typeof options.ssl.ca === "string"
    ? options.ssl.ca : undefined;
  if (!caPem || !options.user || !options.password || !options.host || !options.port)
    throw new Error("Verified staging TLS options missing");

  const connection = await mysql.createConnection({
    ...options, connectTimeout: 15000, multipleStatements: false,
  });
  try {
    const [identity] = await connection.query<RowDataPacket[]>(
      "SELECT DATABASE() AS target, VERSION() AS version"
    );
    const [ssl] = await connection.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if (identity[0]?.target !== STAGING_SCHEMA ||
        !String(identity[0]?.version).startsWith("8.4.") || !ssl[0]?.Value)
      throw new Error("Unexpected target, MySQL version or verified TLS");
    const [tables] = await connection.execute<RowDataPacket[]>(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
    );
    const names = new Set(tables.map(x => String(x.name)));
    for (const name of ["users", "localCredentials", "learnerProfiles",
      "introductoryResponses", "learnerPlacementAnswers", "learnerPlacementPlans"])
      if (!names.has(name)) throw new Error("Staging prerequisite schema missing");
    if (names.has("learnerMemories"))
      throw new Error("0007 already applied; pre-migration backup is not valid");
    console.log("Aiven staging target, MySQL 8.4, TLS, pre-0007 schema verified");
  } finally { await connection.end(); }

  const dir = join(tmp, "lingua-aiven-0007");
  mkdirSync(dir, {recursive:true,mode:0o700});
  const config = [
    "[client]",
    "host=" + mysqlOptionValue(options.host),
    "port=" + options.port,
    "user=" + mysqlOptionValue(options.user),
    "password=" + mysqlOptionValue(options.password),
    "ssl-mode=VERIFY_IDENTITY",
    "ssl-ca=/secure/ca.pem",
    "default-character-set=utf8mb4",
    "",
  ].join("\n");
  writeFileSync(join(dir,"client.cnf"),config,{mode:0o600,flag:"wx"});
  writeFileSync(join(dir,"ca.pem"),caPem,{mode:0o600,flag:"wx"});
  console.log("Prepared ephemeral TLS-verified read-only backup client configuration");
}
main().catch(()=>{
  console.error("Guarded Aiven staging backup preflight failed (details suppressed)");
  process.exitCode = 1;
});
