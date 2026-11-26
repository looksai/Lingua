import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import type { User } from "../drizzle/schema";

const lab = vi.hoisted(() => ({
  register: vi.fn(), login: vi.fn(), rateNamespace: 0,
}));
vi.mock("./auth-local", async importOriginal => {
  const actual = await importOriginal<typeof import("./auth-local")>();
  return {
    ...actual,
    registerLocalUser: lab.register,
    loginLocalUser: lab.login,
    // Real limiter, isolated keys per test; no production state or bypass.
    rateLimit: (key: string) => actual.rateLimit("academy-http:" + lab.rateNamespace + ":" + key),
  };
});
vi.mock("./db", async importOriginal => ({
  ...await importOriginal<typeof import("./db")>(),
  getDb: async () => { throw new Error("Database access forbidden in Academy HTTP fixture"); },
}));

import { appRouter } from "./routers";
import { normalizeEmail, verifySession } from "./auth-local";

const email = "academy-a@synthetic.invalid";
const emailB = "academy-b@synthetic.invalid";
const code = "A".repeat(43);
const codeB = "B".repeat(43);
const password = "synthetic-password-only";
const makeRow = (email: string, token: string, expiresAt = "2099-01-01T00:00:00Z") => ({
  email, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt,
});
const row = makeRow(email, code);
const rowB = makeRow(emailB, codeB);
const accounts = new Map<string, User>();
let seq = 0;
let server: Server;
let base = "";

function invite(rows: unknown = [row, rowB]) {
  vi.stubEnv("ACADEMY_ADMISSION_MODE", "invite");
  vi.stubEnv("ACADEMY_INVITATIONS_JSON", JSON.stringify(rows));
}
async function post(method: string, payload: unknown, options: { origin?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: options.origin ?? base };
  if (options.cookie) headers.Cookie = options.cookie;
  return fetch(base + "/api/trpc/auth." + method, { method: "POST", headers, body: JSON.stringify({ json: payload }) });
}
function signup(mail: string, token?: string, origin?: string) {
  return post("signUp", { email: mail, password, inviteCode: token }, { origin });
}
function session(response: Response) {
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=Lax");
  return cookie!.split(";")[0];
}
async function me(cookie?: string) {
  const response = await fetch(base + "/api/trpc/auth.me", { headers: cookie ? { Cookie: cookie } : {} });
  expect(response.status).toBe(200);
  return (await response.json()).result.data.json;
}
async function mode() {
  const response = await fetch(base + "/api/trpc/auth.registrationMode");
  expect(response.status).toBe(200);
  return (await response.json()).result.data.json;
}

describe("Academy admission over real Express/tRPC/JWT (synthetic account store)", () => {
  beforeAll(async () => {
    const app = express();
    app.use("/api/trpc", createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req, res }) => {
        const identity = await verifySession(parseCookie(req.headers.cookie ?? "")[COOKIE_NAME]);
        const user = [...accounts.values()].find(x => x.id === identity?.id && x.openId === identity?.openId) ?? null;
        return { req, res, user };
      },
    }));
    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing local port");
    base = "http://127.0.0.1:" + address.port;
  });
  beforeEach(() => {
    lab.rateNamespace++;
    accounts.clear();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SESSION_SECRET", "synthetic-academy-http-secret-never-used-in-production");
    invite();
    lab.register.mockReset();
    lab.login.mockReset();
    lab.register.mockImplementation(async (mail: string) => {
      const normalized = normalizeEmail(mail);
      if (accounts.has(normalized)) throw new TRPCError({ code: "CONFLICT", message: "Cadastro indisponível" });
      const id = ++seq;
      const user = { id, openId: "local:academy-http-" + id, email: normalized, loginMethod: "local", role: "user" } as User;
      accounts.set(normalized, user);
      return user;
    });
    lab.login.mockImplementation(async (mail: string) => {
      const user = accounts.get(normalizeEmail(mail));
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return user;
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  });

  it("does not expose invitation configuration through the public mode endpoint", async () => {
    expect(await mode()).toBe("invite");
    expect(await me()).toBeNull();
  });
  it("blocks direct HTTP signup without a code, with wrong code or wrong email before any write", async () => {
    for (const response of [await signup(email), await signup(email, codeB), await signup("other@synthetic.invalid", code)]) {
      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
      const body = await response.text();
      expect(body).not.toContain(row.tokenHash);
      expect(body).not.toContain(code);
    }
    expect(lab.register).not.toHaveBeenCalled();
  });
  it("denies expired, revoked and malformed invitations at the HTTP boundary", async () => {
    invite([makeRow(email, code, "2000-01-01T00:00:00Z")]);
    expect((await signup(email, code)).status).toBe(403);
    invite([]);
    expect((await signup(email, code)).status).toBe(403);
    vi.stubEnv("ACADEMY_INVITATIONS_JSON", "{");
    expect((await signup(email, code)).status).toBe(403);
    expect(lab.register).not.toHaveBeenCalled();
  });
  it("checks origin before registration even with a correct code", async () => {
    expect((await signup(email, code, "https://untrusted.invalid")).status).toBe(403);
    expect(lab.register).not.toHaveBeenCalled();
  });
  it("issues distinct signed sessions for two invited accounts and rejects duplicate signup", async () => {
    const a = await signup(email.toUpperCase(), code);
    const b = await signup(emailB, codeB);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const ca = session(a), cb = session(b);
    expect(ca).not.toBe(cb);
    expect((await me(ca)).email).toBe(email);
    expect((await me(cb)).email).toBe(emailB);
    expect(await me()).toBeNull();
    const duplicate = await signup(email, code);
    expect(duplicate.status).toBe(409);
    expect(duplicate.headers.get("set-cookie")).toBeNull();
    expect(accounts.size).toBe(2);
  });
  it("closing registration does not block existing-account login", async () => {
    const initial = await signup(email, code);
    expect(initial.status).toBe(200);
    vi.stubEnv("ACADEMY_ADMISSION_MODE", "closed");
    expect(await mode()).toBe("closed");
    expect((await signup(emailB, codeB)).status).toBe(403);
    const signed = await post("signIn", { email, password });
    expect(signed.status).toBe(200);
    expect((await me(session(signed))).email).toBe(email);
    expect(lab.register).toHaveBeenCalledTimes(1);
  });
  it("applies the shared per-IP attempt limit across distinct emails", async () => {
    for (let i = 0; i < 8; i++) {
      expect((await signup("attempt-" + i + "@synthetic.invalid", code)).status).toBe(403);
    }
    expect((await signup(email, code)).status).toBe(429);
    expect(lab.register).not.toHaveBeenCalled();
  });
  it("preserves explicitly open legacy mode", async () => {
    vi.stubEnv("ACADEMY_ADMISSION_MODE", "open");
    expect(await mode()).toBe("open");
    expect((await signup(email)).status).toBe(200);
    expect(lab.register).toHaveBeenCalledTimes(1);
  });
});
