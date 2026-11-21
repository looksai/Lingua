import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword, issueSession, verifySession, sessionSecret, checkRequestOrigin, rateLimit } from "./auth-local";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

afterEach(() => vi.unstubAllEnvs());
describe("local authentication security", () => {
  it("uses salted memory-hard hashes and rejects wrong passwords", async () => {
    const a = await hashPassword("my-long-password-for-testing");
    const b = await hashPassword("my-long-password-for-testing");
    expect(a).not.toBe(b);
    expect(a).not.toContain("my-long-password");
    expect(await verifyPassword("my-long-password-for-testing", a)).toBe(true);
    expect(await verifyPassword("wrong-password", a)).toBe(false);
    expect(await verifyPassword("any", "invalid")).toBe(false);
  });
  it("fails closed on missing/weak SESSION_SECRET", () => {
    expect(() => sessionSecret({})).toThrow(/SESSION_SECRET/);
    expect(() => sessionSecret({ SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
  it("issues 12-hour issuer/audience-bound sessions and rejects Manus tokens", async () => {
    vi.stubEnv("SESSION_SECRET", "test-secret-strong-enough-for-32-bytes-not-production");
    const token = await issueSession({ id: 7, openId: "local:123" } as never);
    expect(await verifySession(token)).toEqual({ id: 7, openId: "local:123" });
    expect(await verifySession(token + "tampered")).toBeNull();
    expect(await verifySession("manus-legacy-session")).toBeNull();
    vi.stubEnv("SESSION_SECRET", "another-strong-secret-for-test-rotation");
    expect(await verifySession(token)).toBeNull();
  });
  it("rejects cross-origin and missing-origin requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => checkRequestOrigin({ headers: { origin: "https://evil.example", host: "lingua.onrender.com" } } as never)).toThrow(/Origem/);
    expect(() => checkRequestOrigin({ headers: { host: "lingua.onrender.com" } } as never)).toThrow(/Origem/);
    expect(() => checkRequestOrigin({ headers: { origin: "https://lingua.onrender.com", host: "lingua.onrender.com" } } as never)).not.toThrow();
  });
  it("limits repeated credential guesses", () => {
    const key = "test-attempts-" + Math.random();
    for (let i = 0; i < 8; i++) expect(() => rateLimit(key)).not.toThrow();
    expect(() => rateLimit(key)).toThrow(/Tente novamente/);
  });
  it("denies anonymous learning and offline review, including forged legacy session", async () => {
    const ctx = { user: null, req: { headers: { cookie: `${COOKIE_NAME}=legacy` } }, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.learning.reviewQueue({ limit: 10 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.learning.listItems({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.learning.review({ knowledgeItemId: 1, rating: "good", operationId: "operation-test-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.learning.saveItem({ itemKey: "word", kind: "word", text: "word", normalizedText: "word", language: "en" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
