/** Dedicated MySQL connection options: external databases must verify the server.
 *
 * The URL's ssl-mode=REQUIRED is a hint for other clients; mysql2 does NOT
 * implement it as MySQL's VERIFY_IDENTITY mode. We configure TLS explicitly.
 * Never stringify/print PoolOptions because they contain credentials.
 */
import { X509Certificate } from "node:crypto";
import type { PoolOptions } from "mysql2";

export function buildMysqlPoolOptions(
  databaseUrl: string,
  caBase64: string | undefined
): PoolOptions {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid MySQL DATABASE_URL");
  }
  if (parsed.protocol !== "mysql:" || !parsed.hostname || !parsed.username ||
      parsed.pathname.length <= 1 || parsed.password.length === 0) {
    throw new Error("Invalid MySQL DATABASE_URL");
  }
  const sslMode = parsed.searchParams.get("ssl-mode")?.toUpperCase();
  if (sslMode === "DISABLED" || sslMode === "PREFERRED") {
    throw new Error("MySQL URL requests an insecure TLS mode");
  }
  const port = parsed.port ? Number(parsed.port) : 3306;
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid MySQL port");

  const options: PoolOptions = {
    host: parsed.hostname,
    port,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    connectionLimit: 5,
    waitForConnections: true,
  };

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsed.hostname.toLowerCase()
  );
  // Local disposable GitHub Actions MySQL has no TLS CA by design.
  if (isLoopback && !caBase64) return options;

  // A missing/malformed CA must never silently downgrade external TLS.
  if (!caBase64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(caBase64))
    throw new Error("DATABASE_SSL_CA_BASE64 required for verified MySQL TLS");
  const ca = Buffer.from(caBase64, "base64").toString("utf8");
  if (!ca.includes("-----BEGIN CERTIFICATE-----") ||
      !ca.includes("-----END CERTIFICATE-----"))
    throw new Error("Invalid database CA certificate");
  try {
    const parsedCa = new X509Certificate(ca);
    if (Date.parse(parsedCa.validTo) <= Date.now())
      throw new Error("Database CA certificate has expired");
  } catch {
    throw new Error("Invalid or expired database CA certificate");
  }
  options.ssl = { ca, rejectUnauthorized: true };
  return options;
}
