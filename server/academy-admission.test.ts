import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { academyAdmissionMode, assertAcademyAdmission } from "./academy-admission";

const email = "student@example.test";
const code = "A".repeat(43);
const now = Date.parse("2026-11-25T12:00:00Z");
const row = { email, tokenHash: createHash("sha256").update(code).digest("hex"), expiresAt: "2026-11-26T12:00:00Z" };
const config = (rows: unknown = [row]) => ({ ACADEMY_ADMISSION_MODE: "invite", ACADEMY_INVITATIONS_JSON: JSON.stringify(rows) });
describe("Academy admission", () => {
  it("preserves non-pilot behavior only when unset or explicitly open", () => {
    expect(academyAdmissionMode({})).toBe("open");
    expect(() => assertAcademyAdmission(email, undefined, {})).not.toThrow();
    expect(() => assertAcademyAdmission(email, undefined, { ACADEMY_ADMISSION_MODE: "open" })).not.toThrow();
  });
  it("closes on unknown or explicitly closed mode", () => {
    for (const mode of ["closed", "typo", ""]) {
      const env = { ACADEMY_ADMISSION_MODE: mode };
      expect(academyAdmissionMode(env)).toBe("closed");
      expect(() => assertAcademyAdmission(email, code, env, now)).toThrow("Cadastro indisponível");
    }
  });
  it("accepts the correct unexpired code and normalized email", () => {
    expect(() => assertAcademyAdmission("STUDENT@example.test", code, config(), now)).not.toThrow();
  });
  it.each([undefined, "", "B".repeat(43), "A".repeat(42)])("rejects missing or incorrect code %s", (invalid) => {
    expect(() => assertAcademyAdmission(email, invalid, config(), now)).toThrow("Cadastro indisponível");
  });
  it("rejects an invitation for a different email", () => {
    expect(() => assertAcademyAdmission("other@example.test", code, config(), now)).toThrow("Cadastro indisponível");
  });
  it("rejects at and after expiration", () => {
    for (const time of [Date.parse(row.expiresAt), Date.parse(row.expiresAt) + 1])
      expect(() => assertAcademyAdmission(email, code, config(), time)).toThrow("Cadastro indisponível");
  });
  it("rejects revoked, malformed, duplicated, oversized and missing configurations", () => {
    const cases = [config([]), config([row, row]), config([row, {...row, email: "other@example.test"}]), config(Array(21).fill(row)), config([{...row, tokenHash: "bad"}]), {ACADEMY_ADMISSION_MODE:"invite", ACADEMY_INVITATIONS_JSON:"{"}, {ACADEMY_ADMISSION_MODE:"invite"}];
    for (const env of cases) expect(() => assertAcademyAdmission(email, code, env, now)).toThrow("Cadastro indisponível");
  });
});
