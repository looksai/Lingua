import { randomBytes, randomUUID, timingSafeEqual, scrypt as scryptCallback } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Request } from "express";
import { getDb } from "./db";
import { localCredentials, users, type User } from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const";

const scrypt = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => scryptCallback(password, salt, 64, HASH_PARAMETERS, (error, derived) => error ? reject(error) : resolve(derived)));
const ISSUER = "lingua-auth", AUDIENCE = "lingua-web";
const SESSION_SECONDS = 12 * 60 * 60;
const HASH_PARAMETERS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MAX_ATTEMPTS = 8, WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; expires: number }>();
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function sessionSecret(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const value = env.SESSION_SECRET;
  if (!value || Buffer.byteLength(value, "utf8") < 32) throw new Error("SESSION_SECRET must be at least 32 bytes");
  return new TextEncoder().encode(value);
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt);
  return `scrypt-v1$${salt}$${hash.toString("base64url")}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt-v1" || !salt || !expected) return false;
  const expectedBytes = Buffer.from(expected, "base64url");
  if (expectedBytes.length !== 64) return false;
  const actual = await scrypt(password, salt);
  return timingSafeEqual(actual, expectedBytes);
}
export function rateLimit(key: string, now = Date.now()) {
  // Process-local backstop only; use a shared rate limiter before public launch.
  if (attempts.size > 10000) attempts.clear();
  const current = attempts.get(key);
  if (!current || current.expires <= now) { attempts.set(key, { count: 1, expires: now + WINDOW_MS }); return; }
  if (current.count >= MAX_ATTEMPTS) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Tente novamente mais tarde" });
  current.count++;
}
export function checkRequestOrigin(req: Request) {
  const origin = req.headers.origin, host = req.headers.host;
  if (typeof origin !== "string" || typeof host !== "string") throw new TRPCError({ code: "FORBIDDEN", message: "Origem inválida" });
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host || (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")) throw new Error("origin mismatch");
  } catch { throw new TRPCError({ code: "FORBIDDEN", message: "Origem inválida" }); }
}
export async function issueSession(user: User): Promise<string> {
  return new SignJWT({ uid: user.id, jti: randomUUID() })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(user.openId)
    .setIssuer(ISSUER).setAudience(AUDIENCE).setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`).sign(sessionSecret());
}
export async function verifySession(token: string | undefined): Promise<{ id: number; openId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    if (typeof payload.uid !== "number" || !Number.isSafeInteger(payload.uid) || payload.uid < 1 || typeof payload.sub !== "string" || !payload.sub.startsWith("local:")) return null;
    return { id: payload.uid, openId: payload.sub };
  } catch { return null; }
}
export async function authenticateRequest(req: Request): Promise<User | null> {
  // Legacy Manus cookies and Authorization headers cannot authenticate here.
  const identity = await verifySession(parseCookie(req.headers.cookie ?? "")[COOKIE_NAME]);
  if (!identity) return null;
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(and(eq(users.id, identity.id), eq(users.openId, identity.openId))).limit(1);
  return user?.loginMethod === "local" ? user : null;
}
export async function registerLocalUser(email: string, password: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Banco indisponível" });
  const normalized = normalizeEmail(email), passwordHash = await hashPassword(password);
  try {
    return await db.transaction(async tx => {
      const openId = `local:${randomUUID()}`;
      await tx.insert(users).values({ openId, email: normalized, loginMethod: "local", role: "user", lastSignedIn: new Date() });
      const [user] = await tx.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (!user) throw new Error("User creation failed");
      await tx.insert(localCredentials).values({ userId: user.id, email: normalized, passwordHash });
      return user;
    });
  } catch (error) {
    // Drizzle wraps mysql2 errors in `cause`. Do not stringify database
    // errors: their SQL may contain the stored password hash.
    const cause = typeof error === "object" && error !== null && "cause" in error ? error.cause : error;
    const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
    if (code === "ER_DUP_ENTRY")
      throw new TRPCError({ code: "CONFLICT", message: "Cadastro indisponível para este email. Se você já possui conta, tente entrar." });
    throw error;
  }
}
export async function loginLocalUser(email: string, password: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Banco indisponível" });
  const normalized = normalizeEmail(email);
  const [row] = await db.select({ userId: localCredentials.userId, hash: localCredentials.passwordHash }).from(localCredentials).where(eq(localCredentials.email, normalized)).limit(1);
  const dummy = "scrypt-v1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const valid = await verifyPassword(password, row?.hash ?? dummy);
  if (!valid || !row) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || user.loginMethod !== "local") throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
  return user;
}
