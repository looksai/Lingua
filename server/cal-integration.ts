/**
 * Fase 01 CAL runtime — provisional, process-local pilot only.
 *
 * Activated only with CAL_ENABLED=true and the existing authenticated tutor
 * allowlist. Does not create DB records, grade speaking, assign CEFR, update
 * SRS, or connect CSLE. Pilot sessions disappear after 30min idle or restart.
 *
 * A learner's message is evaluated against a CLOSED SERVER TASK, never against
 * a free-form model guess. An LLM reply is NOT learner evidence; it only
 * confirms the task prompt was actually delivered.
 */
import { randomUUID } from "node:crypto";
import {
  chooseCALPlan, newCALSession, stepCAL,
  type CALEvent, type CALSnapshot, type CALStrategy,
} from "../shared/pedagogy/cal-machine";

type Exercise = Readonly<{
  objectiveId: string;
  english: string;
  translation: string;
  meaningAnswers: readonly string[];
  englishAnswers: readonly string[];
}>;
const PILOT_EXERCISE: Exercise = Object.freeze({
  objectiveId: "pilot.greeting.hello",
  english: "Hello",
  translation: "Olá",
  meaningAnswers: ["ola", "oi"],
  englishAnswers: ["hello"],
});
type Pending = "meaning" | "english" | null;
type Stored = Readonly<{
  snapshot: CALSnapshot;
  pending: Pending;
  lastActive: number;
}>;
export type CALPilotPreview = Readonly<{
  phase: CALSnapshot["phase"];
  strategy: CALStrategy;
  directive: string;
  /** Commits only after valid AI response; the model never decides the result. */
  commit: (answerText: string) => CALSnapshot | null;
}>;
const SESSION_TTL_MS = 30 * 60_000;
const MAX_SESSIONS = 100;
const PILOT_TRIGGER = /(?:aprender|estudar|praticar|treinar|come[cç]ar|ensina|aula|ingl[eê]s|english|zero|revisar)/iu;
const ASKED_TO_PAUSE = /^(?:parar|pausa|pare|chega|hoje n[aã]o|quero parar|at[eé] depois|tchau)[.!? ]*$/iu;
const ASKED_TO_RESUME = /^(?:continuar|vamos continuar|retomar|voltar|vamos voltar|vamos praticar)[.!? ]*$/iu;
const HELP_REQUEST = /^(?:n[aã]o sei|n[aã]o entendi|n[aã]o consigo|ajuda|me ajuda|repete|de novo)[.!? ]*$/iu;
const SHORT_ANSWER_MAX = 45;
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR").replace(/[.!?,;:]+/g, "").replace(/\s+/g, " ").trim();

type PendingCALEvent<T> = T extends unknown ? Omit<T, "eventId" | "expectedVersion" | "sessionId"> : never;
function event(snapshot: CALSnapshot, payload: PendingCALEvent<CALEvent>): CALSnapshot {
  const next = stepCAL(snapshot, {
    ...payload, eventId: randomUUID(),
    sessionId: snapshot.sessionId, expectedVersion: snapshot.version,
  } as CALEvent);
  return next.result === "accepted" ? next.snapshot : snapshot;
}
function hasAnsweredCurrentPrompt(reply: string, phase: CALSnapshot["phase"]): Pending {
  const normalized = norm(reply);
  if (phase === "ENSINAR" &&
      normalized.includes("hello") &&
      /(?:ola|oi)/u.test(normalized) &&
      /(?:o que significa hello|qual (?:e o )?significado de hello|o que (?:quer dizer|significa) a palavra hello)/u.test(normalized))
    return "meaning";
  if (phase === "PRATICAR" &&
      /(?:como (?:voce |você )?(?:cumprimentaria|diria ola|daria oi)|qual palavra (?:voce |você )?usaria em ingles para cumprimentar)/u.test(normalized))
    return "english";
  return null;
}

/**
 * Stable, bounded prompts only. No personal data or user-generated instructions
 * are interpolated here; the usual tutor system rules remain authoritative.
 */
export function calDirective(
  phase: CALSnapshot["phase"], strategy: CALStrategy, previouslyEvaluated: string | null,
): string {
  const preamble = [
    "[PILOTO CAL v0.1: diretriz do servidor Lingua; nunca informe notas ou CEFR.]",
    "Prioridade: respeitar intenção atual do aluno, segurança, resposta em português para iniciantes e fatos autorizados.",
    "Não invente que mediu a pronúncia, aplicou prova, registrou SRS ou certificou domínio.",
    `Estado atual: ${phase}. Estratégia determinística: ${strategy}.`,
  ].join("\n");
  const acknowledgement = previouslyEvaluated === "correct"
    ? "A tentativa anterior foi compatível com a resposta esperada NESTA tarefa fechada; elogio breve, sem chamar isso de domínio."
    : previouslyEvaluated === "incorrect"
      ? "A tentativa anterior foi diferente do gabarito da tarefa fechada; explique com respeito e ofereça outra tentativa."
      : previouslyEvaluated === "not_evaluable"
        ? "A mensagem anterior não pôde ser avaliada; não invente um erro nem um acerto."
        : "";
  if (phase === "ENSINAR") return [preamble, acknowledgement,
    "Explique somente esta microfrase: Hello = Olá. Não introduza outra palavra inglesa.",
    'Se for uma pergunta de ensino pertinente, encerre com exatamente: "O que significa Hello em português?"',
    "Quando o aluno pedir pausa, ajuda em outro tema ou fizer pergunta não relacionada, atenda ao pedido atual; não force esta tarefa.",
  ].filter(Boolean).join("\n");
  if (phase === "PRATICAR") return [preamble, acknowledgement,
    "Proponha UM exercício curto de produção da saudação básica ensinada; sem declarar que o aluno a dominou.",
    'Pergunte em português: "Como você cumprimentaria alguém em inglês?"',
    "Se o aluno perguntou outra coisa ou pediu pausa, responda a ele sem exigir o exercício.",
  ].filter(Boolean).join("\n");
  return [preamble, acknowledgement,
    "Conduza uma única pergunta simples compatível com o estado; não afirme que houve retenção diferida nem transferência validada.",
  ].filter(Boolean).join("\n");
}

export class CALTutorSessions {
  private readonly sessions = new Map<number, Stored>();
  constructor(private readonly now: () => number = Date.now) {}

  private cleanup(now: number) {
    for (const [id, s] of this.sessions)
      if (now - s.lastActive >= SESSION_TTL_MS) this.sessions.delete(id);
    while (this.sessions.size > MAX_SESSIONS) {
      const first = this.sessions.keys().next().value;
      if (first === undefined) break;
      this.sessions.delete(first);
    }
  }

  /**
   * Planning is pure relative to stored runtime state. No mutation is committed
   * if the model fails or a guard rejects the answer. Reuse only for one request.
   */
  prepare(userId: number, userMessage: string, supportsPortuguese: boolean): CALPilotPreview | null {
    if (!Number.isSafeInteger(userId) || userId <= 0) return null;
    const now = this.now();
    this.cleanup(now);
    const original = this.sessions.get(userId);
    if (!original && !PILOT_TRIGGER.test(userMessage)) return null;
    let snapshot = original?.snapshot ?? newCALSession(randomUUID());
    let pending = original?.pending ?? null;
    let result: string | null = null;

    if (snapshot.status === "paused") {
      if (!ASKED_TO_RESUME.test(userMessage)) return null;
      snapshot = event(snapshot, {kind: "RESUME"});
    }
    // "Tchau" might be a learner's wrong translation of "Hello".
    // If a closed task is pending, count it as an answer rather than a pause.
    if (ASKED_TO_PAUSE.test(userMessage) && !(pending && norm(userMessage) === "tchau")) {
      const paused = event(snapshot, {kind: "PAUSE"});
      // Do not send prompt or update in-memory learning evidence on a pause.
      this.sessions.set(userId, {snapshot: paused, pending: null, lastActive: now});
      return null;
    }
    if (snapshot.phase === "OBSERVAR" && snapshot.objectiveId === null) {
      snapshot = event(snapshot, {
        kind: "OBJECTIVE_DEFINED", objectiveId: PILOT_EXERCISE.objectiveId, route: "teach",
      });
    } else if (snapshot.phase === "ENSINAR" && pending === "meaning") {
      if (HELP_REQUEST.test(userMessage)) {
        snapshot = event(snapshot, {kind:"NEEDS_HELP"});
      } else if (userMessage.trim().length <= SHORT_ANSWER_MAX && !userMessage.includes("?")) {
        const correct = PILOT_EXERCISE.meaningAnswers.includes(norm(userMessage));
        snapshot = event(snapshot, {
          kind: "COMPREHENSION", signal: correct ? "demonstrated" : "unclear",
          assessor: "rule",
        });
        result = correct ? "correct" : "incorrect";
      }
    } else if (snapshot.phase === "PRATICAR" && pending === "english") {
      if (HELP_REQUEST.test(userMessage)) {
        snapshot = event(snapshot, {kind:"NEEDS_HELP"});
      } else if (userMessage.trim().length <= SHORT_ANSWER_MAX && !userMessage.includes("?")) {
        const correct = PILOT_EXERCISE.englishAnswers.includes(norm(userMessage));
        snapshot = event(snapshot, {
          kind: "ATTEMPT", attemptId: randomUUID(), taskId: "pilot.greeting.production",
          contextId: "pilot.greeting.initial",
          outcome: correct ? "meets" : "not_yet", assessor: "rule",
          // The student saw the teaching model earlier, so an immediate
          // correct attempt is NOT independent retention or mastery.
          assistance: "model", atMs: now,
        });
        result = correct ? "correct" : "incorrect";
      }
    }
    const plan = chooseCALPlan(snapshot, {
      needsPortugueseSupport: supportsPortuguese,
      audioConsent: false, audioAvailable: false,
    });
    const directive = calDirective(snapshot.phase, plan.strategy, result);
    let alreadyCommitted = false;
    return {
      phase: snapshot.phase,
      strategy: plan.strategy,
      directive,
      commit: (answerText: string) => {
        if (alreadyCommitted || !answerText.trim()) return null;
        alreadyCommitted = true;
        const current = this.sessions.get(userId);
        if (current !== original) return null; // Stale session/another tab.
        let next = snapshot;
        if (next.phase === "ENSINAR" &&
            norm(answerText).includes("hello") &&
            /(?:ola|oi)/u.test(norm(answerText))) {
          next = event(next, {kind: "MODEL_PRESENTED", atMs: now});
        }
        // Only assign a task when the text actually contained its expected
        // question; never grade student against an imaginary model prompt.
        pending = hasAnsweredCurrentPrompt(answerText, next.phase);
        this.sessions.delete(userId);
        this.sessions.set(userId, {snapshot: next, pending, lastActive: this.now()});
        this.cleanup(this.now());
        return next;
      },
    };
  }

  /** Test-only observability. Not wired to HTTP, telemetry or storage. */
  inspectForTest(userId: number): Readonly<{snapshot:CALSnapshot; pending:Pending}> | null {
    const current = this.sessions.get(userId);
    return current ? {snapshot:current.snapshot, pending:current.pending} : null;
  }
}
export const calTutorSessions = new CALTutorSessions();
export function calEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CAL_ENABLED === "true";
}
