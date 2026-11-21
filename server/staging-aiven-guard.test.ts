import { describe, expect, it } from "vitest";
import {
  assertStagingTarget, mayMigrate, MIGRATION_CONFIRM, STAGING_HOST, STAGING_SCHEMA, STAGING_PORT,
} from "../scripts/staging-aiven-guard";

const valid = `mysql://avnadmin:fake-for-tests@${STAGING_HOST}:${STAGING_PORT}/${STAGING_SCHEMA}?ssl-mode=REQUIRED`;

describe("Lingua guarded staging runner (no network)", () => {
  it("accepts only the founder's designated Aiven host, port, and schema", () => {
    expect(() => assertStagingTarget(valid)).not.toThrow();
    for (const unsafe of [
      valid.replace(STAGING_HOST, "production.somewhere.com"),
      valid.replace(String(STAGING_PORT), "3306"),
      valid.replace(STAGING_SCHEMA, "production"),
      valid.replace("mysql:", "postgres:"),
    ]) expect(() => assertStagingTarget(unsafe)).toThrow(/Refusing/);
  });
  it("cannot migrate on a routine inspect", () => {
    expect(mayMigrate("inspect", "", [], "refs/heads/main", "workflow_dispatch")).toBe(false);
  });
  it("refuses non-empty staging even with explicit migrate confirmation", () => {
    expect(() => mayMigrate("migrate", MIGRATION_CONFIRM, ["users"], "refs/heads/main", "workflow_dispatch"))
      .toThrow(/not empty/);
  });
  it("requires exact confirmation and main manual workflow", () => {
    expect(() => mayMigrate("migrate","wrong",[],"refs/heads/main","workflow_dispatch")).toThrow();
    expect(() => mayMigrate("migrate",MIGRATION_CONFIRM,[],"refs/heads/feature","workflow_dispatch")).toThrow();
    expect(() => mayMigrate("migrate",MIGRATION_CONFIRM,[],"refs/heads/main","push")).toThrow();
    expect(mayMigrate("migrate",MIGRATION_CONFIRM,[],"refs/heads/main","workflow_dispatch")).toBe(true);
  });
});
