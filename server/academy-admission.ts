import { createHash, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const invitation = z.object({
  email: z.email().max(320),
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  expiresAt: z.iso.datetime(),
}).strict();
const invitations = z.array(invitation).max(20);
export function academyAdmissionMode(env: NodeJS.ProcessEnv = process.env): "open" | "invite" | "closed" {
  const mode = env.ACADEMY_ADMISSION_MODE;
  // Preserve existing non-pilot deployments; explicit invalid values fail closed.
  if (mode === undefined || mode === "open") return "open";
  return mode === "invite" ? "invite" : "closed";
}
export function assertAcademyAdmission(email: string, code: string | undefined, env: NodeJS.ProcessEnv = process.env, now = Date.now()): void {
  const mode = academyAdmissionMode(env);
  if (mode === "open") return;
  const deny = () => new TRPCError({ code: "FORBIDDEN", message: "Cadastro indisponível. Confira seu convite da Academy Beta." });
  if (mode !== "invite" || !code || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw deny();
  let parsed: z.infer<typeof invitations>;
  try {
    parsed = invitations.parse(JSON.parse(env.ACADEMY_INVITATIONS_JSON ?? "[]"));
  } catch { throw deny(); }
  const normalize = (value: string) => value.trim().toLowerCase();
  if (new Set(parsed.map(row => normalize(row.email))).size !== parsed.length ||
      new Set(parsed.map(row => row.tokenHash)).size !== parsed.length) throw deny();
  const digest = createHash("sha256").update(code).digest();
  const row = parsed.find(item => normalize(item.email) === normalize(email));
  if (!row || !Number.isFinite(now) || Date.parse(row.expiresAt) <= now ||
      !timingSafeEqual(digest, Buffer.from(row.tokenHash, "hex"))) throw deny();
}
