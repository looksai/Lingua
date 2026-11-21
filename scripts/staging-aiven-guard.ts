/** Guard for the one temporary Aiven MySQL staging instance.
 * No credentials are printed; this file contains only the non-secret DB target.
 */
export const STAGING_HOST = "mysql-180b49ae-lingua.a.aivencloud.com";
export const STAGING_PORT = 14403;
export const STAGING_SCHEMA = "defaultdb";
export const MIGRATION_CONFIRM = "APLICAR_0000_0001_0002_SOMENTE_LINGUA";

export function assertStagingTarget(databaseUrl: string): void {
  let uri: URL;
  try { uri = new URL(databaseUrl); }
  catch { throw new Error("Invalid staging MySQL URI"); }
  if (
    uri.protocol !== "mysql:" ||
    uri.hostname !== STAGING_HOST ||
    Number(uri.port) !== STAGING_PORT ||
    uri.pathname !== `/${STAGING_SCHEMA}` ||
    !uri.username || !uri.password
  ) {
    throw new Error("Refusing database that does not match Lingua Aiven staging");
  }
}
export function mayMigrate(
  action: string,
  confirmation: string,
  existingTables: string[],
  githubRef: string,
  githubEvent: string
): boolean {
  if (action !== "migrate") return false;
  if (githubRef !== "refs/heads/main" || githubEvent !== "workflow_dispatch")
    throw new Error("Migrations must run manually from main");
  if (confirmation !== MIGRATION_CONFIRM)
    throw new Error("Explicit staging migration confirmation required");
  if (existingTables.length !== 0)
    throw new Error("Refusing migration: database is not empty");
  return true;
}
