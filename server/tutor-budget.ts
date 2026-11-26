import { TRPCError } from "@trpc/server";

const DAY = 86_400_000;
// Process-local budget: not a durable financial limit. Provider access remains allowlisted.
export function tutorMode(env=process.env):"groq"|"openai"|"off" {
  if(env.LINGUA_TUTOR_PROVIDER==="groq-gemini")return "groq";
  if(env.LINGUA_TUTOR_PROVIDER==="openai")return "openai";
  return "off";
}
function testerAllowed(email:string|null|undefined,env:NodeJS.ProcessEnv){
  const allowed=(env.LINGUA_TUTOR_ALLOWED_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  return Boolean(env.LINGUA_TUTOR_ENABLED==="true"&&email&&allowed.includes(email.trim().toLowerCase()));
}
export function paidTutorAllowed(email:string|null|undefined,env=process.env){
  return tutorMode(env)==="openai"&&Boolean(env.OPENAI_API_KEY)&&testerAllowed(email,env);
}
export function freeTutorAllowed(email:string|null|undefined,env=process.env){
  return tutorMode(env)==="groq"&&Boolean(env.GROQ_API_KEY)&&testerAllowed(email,env);
}
export function geminiDemoAllowed(email:string|null|undefined,env=process.env){
  return tutorMode(env)==="groq"&&Boolean(env.GEMINI_API_KEY)&&testerAllowed(email,env);
}
type Limits = { global: number; perUser: number; concurrent: number };
function boundedLimit(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= fallback ? parsed : 0;
}
export function tutorBudgetLimits(env: NodeJS.ProcessEnv = process.env): Limits {
  return {
    global: boundedLimit(env.LINGUA_TUTOR_DAILY_GLOBAL, 100),
    perUser: boundedLimit(env.LINGUA_TUTOR_DAILY_PER_USER, 30),
    concurrent: boundedLimit(env.LINGUA_TUTOR_MAX_CONCURRENT, 2),
  };
}
export function createTutorBudget() {
  let day = -1;
  let total = 0;
  const perUser = new Map<number, number>();
  const active = new Set<number>();
  return async function reserve<T>(userId: number, operation: () => Promise<T>, now = Date.now(), units = 1, env: NodeJS.ProcessEnv = process.env): Promise<T> {
    const today = Math.floor(now / DAY);
    const limits = tutorBudgetLimits(env);
    const denied = () => new TRPCError({code:"TOO_MANY_REQUESTS",message:"Limite de teste do tutor atingido ou solicitação em andamento."});
    if (!Number.isFinite(today) || today < 0 || !Number.isSafeInteger(units) || units < 1 || units > 2) throw denied();
    // Do not reset quota when the clock moves backwards. In-flight calls remain active across midnight.
    if (today > day) { day = today; total = 0; perUser.clear(); }
    if (total + units > limits.global || (perUser.get(userId) ?? 0) + units > limits.perUser || active.size >= limits.concurrent || active.has(userId)) throw denied();
    // Reserve before calling vendor; failed and partially completed operations count too.
    total += units;
    perUser.set(userId, (perUser.get(userId) ?? 0) + units);
    active.add(userId);
    try { return await operation(); } finally { active.delete(userId); }
  };
}
export const withTutorBudget = createTutorBudget();
