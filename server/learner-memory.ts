import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { learnerMemories, learnerPrivacyPreferences } from "../drizzle/schema";
import { getDb } from "./db";

export const memoryCategory = z.enum(["profissao", "objetivo", "interesse", "preferencia_estudo"]);
export const learnerMemoryInput = z.object({
  fato: z.string().trim().min(6).max(240),
  categoria: memoryCategory,
  sourceMessage: z.string().trim().min(6).max(1200),
  consent: z.literal(true),
});
export type MemoryProposal = Pick<z.infer<typeof learnerMemoryInput>, "fato" | "categoria">;

export function memoryFeatureEnabled(env = process.env) {
  // Off by default while the manually-reviewed migration is pending.
  return env.LINGUA_TUTOR_MEMORY_ENABLED === "true";
}

// Deliberately conservative MVP filter. Not a comprehensive DLP classifier.
// Only self-disclosed, relatively stable study context can be proposed.
export function safeLearnerFact(fato: string, sourceMessage: string): boolean {
  const normalized = fato.trim();
  if (normalized.length < 6 || normalized.length > 240) return false;
  if (!sourceMessage.toLocaleLowerCase("pt-BR").includes(normalized.toLocaleLowerCase("pt-BR"))) return false;
  if (!/^(?:eu\s|sou\s|tenho\s|trabalho\s|atuo\s|quero\s|pretendo\s|vou\s|estou\s|gosto\s|prefiro\s|meu\s+objetivo\b|minha\s+meta\b|i\s|my\s)/iu.test(normalized)) return false;
  if (/@|https?:\/\/|\b(?:cpf|rg|senha|password|token|api\s*key|telefone|endereço|whatsapp|cartão|credit card|conta bancária)\b/iu.test(normalized)) return false;
  if (/\b(?:saúde|doença|diagnóstic[oa]|medicamento|depressão|ansiedade|sexualidade|orientação sexual|religião|religious|partido político|voto|political party|health|diagnosis|disability|pregnan(?:t|cy))\b/iu.test(normalized)) return false;
  if (/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-.\s]?\d{2}\b/.test(normalized)) return false;
  return true;
}

// The LLM's output is ALWAYS untrusted. In particular, a model cannot save
// memory or invent a source quote: exact quotation + learner opt-in are required.
export function parseTutorMemoryEnvelope(raw: string, sourceMessage: string):
  { text: string; memoryCandidate: MemoryProposal | null } {
  const plain = { text: raw.trim().slice(0, 1200), memoryCandidate: null };
  try {
    const data = JSON.parse(raw) as unknown;
    const parsed = z.object({
      resposta: z.string().trim().min(1).max(1200),
      memoria: z.object({ fato: z.string(), categoria: memoryCategory }).nullable(),
    }).safeParse(data);
    if (!parsed.success) return raw.trim().startsWith("{")
      ? { text: "Vamos praticar inglês? Conte qual situação você quer treinar.", memoryCandidate: null }
      : plain;
    const { resposta, memoria } = parsed.data;
    if (!memoria || !safeLearnerFact(memoria.fato, sourceMessage)) return { text: resposta, memoryCandidate: null };
    return { text: resposta, memoryCandidate: { fato: memoria.fato.trim(), categoria: memoria.categoria } };
  } catch {
    return plain;
  }
}

function memoryKey(fato: string) {
  return createHash("sha256").update(fato.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")).digest("hex");
}
async function memoryDb() {
  const db = await getDb();
  if (!db) throw Error("memory database unavailable");
  return db;
}

export async function loadLearnerMemories(userId: number) {
  const db = await memoryDb();
  return db.select({
    id: learnerMemories.id,
    fato: learnerMemories.fato,
    categoria: learnerMemories.categoria,
    origem: learnerMemories.origem,
    createdAt: learnerMemories.createdAt,
  }).from(learnerMemories).where(eq(learnerMemories.userId, userId))
    .orderBy(desc(learnerMemories.createdAt), desc(learnerMemories.id)).limit(5);
}
export async function listLearnerMemories(userId: number) {
  const db = await memoryDb();
  return db.select({
    id: learnerMemories.id,
    fato: learnerMemories.fato,
    categoria: learnerMemories.categoria,
    origem: learnerMemories.origem,
    createdAt: learnerMemories.createdAt,
  }).from(learnerMemories).where(eq(learnerMemories.userId, userId))
    .orderBy(desc(learnerMemories.createdAt), desc(learnerMemories.id)).limit(100);
}
export async function saveLearnerMemory(userId: number, input: z.infer<typeof learnerMemoryInput>) {
  if (!safeLearnerFact(input.fato, input.sourceMessage)) throw Error("memory candidate not an eligible self-disclosed quote");
  const db = await memoryDb();
  const fato = input.fato.trim();
  const factKey = memoryKey(fato);
  await db.insert(learnerMemories).values({
    userId, fato, factKey, categoria: input.categoria, origem: "aluno_confirmou_no_chat",
  }).onDuplicateKeyUpdate({ set: { factKey } }); // idempotent retries, no consent inferred
  return { saved: true as const };
}
export async function deleteLearnerMemory(userId: number, id: number) {
  const db = await memoryDb();
  await db.delete(learnerMemories).where(and(eq(learnerMemories.userId, userId), eq(learnerMemories.id, id)));
  return { deleted: true as const };
}
export async function clearLearnerMemories(userId: number) {
  const db = await memoryDb();
  await db.delete(learnerMemories).where(eq(learnerMemories.userId, userId));
  return { deleted: true as const };
}

/**
 * Only the server can save without a per-fact prompt. The row lock is shared
 * with preference updates; a concurrent disable cannot be overtaken by
 * a late model response. Absent/legacy/stale choice is an unconditional NO.
 */
export async function autoSaveLearnerMemory(userId: number, proposal: MemoryProposal, sourceMessage: string) {
  if (!safeLearnerFact(proposal.fato, sourceMessage)) return { saved: false as const };
  const db = await memoryDb();
  return db.transaction(async tx => {
    const [choice] = await tx.select().from(learnerPrivacyPreferences)
      .where(eq(learnerPrivacyPreferences.userId, userId)).for("update").limit(1);
    if (!choice || choice.policyVersion !== 1 || choice.personalMemoryEnabled !== 1)
      return { saved: false as const };
    const fato = proposal.fato.trim();
    const factKey = memoryKey(fato);
    await tx.insert(learnerMemories).values({
      userId, fato, factKey, categoria: proposal.categoria,
      origem: "preferencia_inicial_memoria_v1",
    }).onDuplicateKeyUpdate({ set: { factKey } });
    return { saved: true as const };
  });
}
