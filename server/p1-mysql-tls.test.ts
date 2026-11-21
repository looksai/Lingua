import { describe, expect, it } from "vitest";
import { rootCertificates } from "node:tls";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";

// A public trust-store CA fixture only: no Aiven credentials or personal CA in Git.
const ca = Buffer.from(rootCertificates[0], "utf8").toString("base64");
const url = "mysql://test_user:placeholder-secret@mysql.example.test:14403/testdb?ssl-mode=REQUIRED";

describe("P1: external MySQL TLS configuration (no network)", () => {
  it("requires a CA for an external database even with ssl-mode=REQUIRED", () => {
    expect(() => buildMysqlPoolOptions(url, undefined)).toThrow(/CA_BASE64 must contain Base64/);
    expect(() => buildMysqlPoolOptions(url, "")).toThrow(/CA_BASE64 must contain Base64/);
  });
  it("verifies the server CA without insecure TLS bypass", () => {
    const options = buildMysqlPoolOptions(url, ca);
    expect(options.host).toBe("mysql.example.test");
    expect(options.port).toBe(14403);
    expect(options.database).toBe("testdb");
    expect(options.ssl).toMatchObject({
      rejectUnauthorized: true, ca: rootCertificates[0],
    });
  });
  it("accepts wrapped CA Base64 copied into GitHub secrets without weakening TLS", () => {
    const wrapped = " \n" + ca.slice(0, 120) + "\n" + ca.slice(120) + " \n";
    const options = buildMysqlPoolOptions(url, wrapped);
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true, ca: rootCertificates[0] });
  });
  it("rejects non-Base64 CA secrets before networking", () => {
    expect(() => buildMysqlPoolOptions(url, "ca.pem")).toThrow(/must contain Base64/);
  });
  it("rejects invalid and expired CA data before opening any connection", () => {
    const malformed = Buffer.from("not a certificate").toString("base64");
    expect(() => buildMysqlPoolOptions(url, malformed)).toThrow(/Invalid database CA/);
    expect(() => buildMysqlPoolOptions(url, "%%")).toThrow(/CA_BASE64 must contain Base64/);
  });
  it("rejects insecure connection modes even if a CA was given", () => {
    expect(() => buildMysqlPoolOptions(url.replace("REQUIRED", "DISABLED"), ca))
      .toThrow(/insecure TLS mode/);
    expect(() => buildMysqlPoolOptions(url.replace("REQUIRED", "PREFERRED"), ca))
      .toThrow(/insecure TLS mode/);
  });
  it("keeps disposable loopback MySQL tests working without TLS CA", () => {
    const localhost = "mysql://lingua_test:disposable-test-only@127.0.0.1:3306/lingua_p0_test";
    const options = buildMysqlPoolOptions(localhost, undefined);
    expect(options.ssl).toBeUndefined();
    expect(options.connectionLimit).toBe(5);
  });
  it("fails on malformed endpoints without exposing credentials in errors", () => {
    expect(() => buildMysqlPoolOptions("postgres://x:secret@localhost:5432/db", ca))
      .toThrow(/Invalid MySQL DATABASE_URL/);
    expect(() => buildMysqlPoolOptions("mysql://user:privatepassword@remote.test/db", undefined))
      .toThrow(/DATABASE_SSL_CA_BASE64 must contain Base64/);
  });
});
