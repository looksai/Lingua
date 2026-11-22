import { TRPCError } from "@trpc/server";

const DAY = 86_400_000;
// Fail closed for initial staging: no paid API access for arbitrary public signups.
// Process-local quota is a backstop, NOT a durable billing limit.
let day = -1;
let total = 0;
const perUser = new Map<number, number>();
const active = new Set<number>();

export function paidTutorAllowed(email: string | null | undefined, env = process.env) {
  const allowed = (env.LINGUA_TUTOR_ALLOWED_EMAILS ?? "").split(",")
    .map(x => x.trim().toLowerCase()).filter(Boolean);
  return Boolean(env.OPENAI_API_KEY && env.LINGUA_TUTOR_ENABLED === "true" &&
    email && allowed.includes(email.trim().toLowerCase()));
}
export async function withTutorBudget<T>(userId: number, operation: () => Promise<T>, now = Date.now()): Promise<T> {
  const today = Math.floor(now / DAY);
  if (day !== today) { day = today; total = 0; perUser.clear(); }
  if (total >= 100 || (perUser.get(userId) ?? 0) >= 30 || active.size >= 2 || active.has(userId))
    throw new TRPCError({code:"TOO_MANY_REQUESTS",message:"Limite de teste do tutor atingido ou solicitação em andamento."});
  // Reserve before calling vendor; failed requests count too.
  total++;
  perUser.set(userId, (perUser.get(userId) ?? 0) + 1);
  active.add(userId);
  try { return await operation(); } finally { active.delete(userId); }
}
