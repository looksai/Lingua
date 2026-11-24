/**
 * CAL v0.1 — pure, synthetic teaching-state machine (Fase 01).
 *
 * No database, LLM, client, SRS or CSLE imports; NO production wiring.
 * Event IDs, rubrics, clocks, and assessor identity must eventually be verified
 * by a trusted Lingua service, never accepted as facts from browser/LLM input.
 *
 * OBSERVAR → ENSINAR → PRATICAR → RETOMAR → TRANSFERIR → COMPROVAR
 * is a repertoire of legal states, NOT a mandatory six-step ladder per chat.
 */
export const CAL_STATES = [
  "OBSERVAR", "ENSINAR", "PRATICAR", "RETOMAR", "TRANSFERIR", "COMPROVAR",
] as const;
export type CALState = typeof CAL_STATES[number];
export type CALStatus = "active" | "paused" | "closed";
export type CALAssessor = "rule" | "human" | "llm_candidate" | "asr_only";
export type CALOutcome = "meets" | "partial" | "not_yet" | "not_evaluable";
export type CALAssistance = "none" | "hint" | "translation" | "model";

export type CALObservation = Readonly<{
  attemptId: string;
  taskId: string;
  contextId: string;
  stage: "PRATICAR" | "RETOMAR" | "TRANSFERIR";
  outcome: CALOutcome;
  assessor: CALAssessor;
  assistance: CALAssistance;
  observedAtMs: number;
  // Never include student text/audio or biographical memories here.
}>;

export type CALSnapshot = Readonly<{
  sessionId: string;
  version: number;
  status: CALStatus;
  phase: CALState;
  objectiveId: string | null;
  consecutiveErrors: number;
  reteachCycles: number;
  lastTaughtAtMs: number | null;
  practiceReady: boolean;
  retrievalReady: boolean;
  transferAttempted: boolean;
  transferIndependent: boolean;
  transferTaskId: string | null;
  transferContextId: string | null;
  observations: readonly CALObservation[];
  processedEventIds: readonly string[];
}>;

type CALBaseEvent = Readonly<{
  sessionId: string;
  eventId: string;
  expectedVersion: number;
}>;
export type CALEvent = CALBaseEvent & (
  | { kind: "OBJECTIVE_DEFINED"; objectiveId: string; route: "teach" | "prior_practice" }
  | { kind: "MODEL_PRESENTED"; atMs: number }
  | { kind: "COMPREHENSION"; signal: "demonstrated" | "wants_to_try" | "self_report" | "unclear"; assessor: CALAssessor }
  | { kind: "ATTEMPT"; attemptId: string; taskId: string; contextId: string;
      outcome: CALOutcome; assessor: CALAssessor; assistance: CALAssistance; atMs: number }
  | { kind: "START_RECALL"; atMs: number }
  | { kind: "START_TRANSFER"; taskId: string; contextId: string }
  | { kind: "SUMMARIZE" }
  | { kind: "RESET_OBJECTIVE" }
  | { kind: "NEEDS_HELP" }
  | { kind: "PAUSE" }
  | { kind: "RESUME" }
  | { kind: "CLOSE" }
);

export type CALDecision = Readonly<{
  result: "accepted" | "rejected" | "duplicate";
  reason: string;
  snapshot: CALSnapshot;
}>;

export type CALPolicy = Readonly<{
  reteachAfterErrors: number;
  maxReteachCycles: number;
  // Classification for reporting a delayed observation only, never certification.
  delayedRecallThresholdMs: number;
}>;
export const DEFAULT_CAL_POLICY: CALPolicy = Object.freeze({
  reteachAfterErrors: 3,
  maxReteachCycles: 2,
  delayedRecallThresholdMs: 86_400_000,
});

export function newCALSession(sessionId: string): CALSnapshot {
  if (!sessionId.trim()) throw new Error("sessionId is required");
  return {
    sessionId, version: 0, status: "active", phase: "OBSERVAR",
    objectiveId: null, consecutiveErrors: 0, reteachCycles: 0,
    lastTaughtAtMs: null, practiceReady: false, retrievalReady: false,
    transferAttempted: false, transferIndependent: false,
    transferTaskId: null, transferContextId: null,
    observations: [], processedEventIds: [],
  };
}

const MAX_EVENTS = 80;
const MAX_OBSERVATIONS = 80;
const trustedAssessor = (assessor: CALAssessor) =>
  assessor === "rule" || assessor === "human";

function validPolicy(p: CALPolicy): boolean {
  return Number.isSafeInteger(p.reteachAfterErrors) && p.reteachAfterErrors >= 1 &&
    Number.isSafeInteger(p.maxReteachCycles) && p.maxReteachCycles >= 0 &&
    Number.isSafeInteger(p.delayedRecallThresholdMs) && p.delayedRecallThresholdMs >= 0;
}

function lastPracticeContext(state: CALSnapshot): string | null {
  return [...state.observations].reverse().find(item =>
    item.stage === "PRATICAR" && item.outcome === "meets" &&
    trustedAssessor(item.assessor))?.contextId ?? null;
}

export function stepCAL(
  state: CALSnapshot,
  event: CALEvent,
  policy: CALPolicy = DEFAULT_CAL_POLICY,
): CALDecision {
  const reject = (reason: string): CALDecision => ({result: "rejected", reason, snapshot: state});
  if (!validPolicy(policy)) return reject("invalid_policy");
  if (event.sessionId !== state.sessionId) return reject("wrong_session");
  if (!event.eventId.trim()) return reject("invalid_event_id");
  if (state.processedEventIds.includes(event.eventId))
    return {result: "duplicate", reason: "already_processed", snapshot: state};
  if (event.expectedVersion !== state.version) return reject("stale_version");
  if (state.status === "closed") return reject("session_closed");

  const accept = (changes: Partial<CALSnapshot>, reason: string): CALDecision => ({
    result: "accepted",
    reason,
    snapshot: {
      ...state, ...changes, version: state.version + 1,
      processedEventIds: [...state.processedEventIds, event.eventId].slice(-MAX_EVENTS),
    },
  });

  if (event.kind === "CLOSE") return accept({status: "closed"}, "closed_by_learner");
  if (event.kind === "PAUSE") {
    if (state.status !== "active") return reject("not_active");
    return accept({status: "paused"}, "learner_paused");
  }
  if (event.kind === "RESUME") {
    if (state.status !== "paused") return reject("not_paused");
    return accept({status: "active"}, "learner_resumed");
  }
  if (state.status !== "active") return reject("session_paused");
  if (event.kind === "RESET_OBJECTIVE") {
    return accept({
      phase: "OBSERVAR", objectiveId: null, consecutiveErrors: 0,
      reteachCycles: 0, lastTaughtAtMs: null, practiceReady: false,
      retrievalReady: false, transferAttempted: false, transferIndependent: false,
      transferTaskId: null, transferContextId: null, observations: [],
    }, "objective_reset_by_learner");
  }
  if (event.kind === "NEEDS_HELP") {
    if (state.objectiveId === null) return reject("no_objective");
    return accept({phase: "ENSINAR", practiceReady: false,
      retrievalReady: false, consecutiveErrors: 0,
      reteachCycles: state.reteachCycles + 1}, "learner_requested_reteach");
  }

  switch (event.kind) {
    case "OBJECTIVE_DEFINED": {
      if (state.phase !== "OBSERVAR" || state.objectiveId !== null)
        return reject("not_observing");
      if (!event.objectiveId.trim()) return reject("invalid_objective");
      return accept({
        phase: event.route === "teach" ? "ENSINAR" : "PRATICAR",
        objectiveId: event.objectiveId,
      }, event.route === "teach" ? "teach_new_objective" : "practice_prior_objective");
    }
    case "MODEL_PRESENTED": {
      if (state.phase !== "ENSINAR" || !Number.isFinite(event.atMs) || event.atMs < 0)
        return reject("invalid_model_event");
      return accept({lastTaughtAtMs: event.atMs}, "model_delivered_not_learning_proof");
    }
    case "COMPREHENSION": {
      if (state.phase !== "ENSINAR") return reject("not_teaching");
      if (event.signal === "wants_to_try")
        return accept({phase: "PRATICAR", consecutiveErrors: 0}, "learner_opted_into_practice_unverified");
      if (event.signal === "demonstrated" && state.lastTaughtAtMs !== null && trustedAssessor(event.assessor))
        return accept({phase: "PRATICAR", consecutiveErrors: 0}, "microcomprehension_observed");
      // "Entendi", mere self-report, LLM-only judgments and unclear signals
      // do not prove comprehension or advance the learner.
      return accept({}, "comprehension_not_verified");
    }
    case "ATTEMPT": {
      const attemptPhase = state.phase;
      if (attemptPhase !== "PRATICAR" && attemptPhase !== "RETOMAR" &&
          attemptPhase !== "TRANSFERIR") return reject("not_in_attempt_phase");
      if (!event.attemptId.trim() || !event.taskId.trim() || !event.contextId.trim() ||
          !Number.isFinite(event.atMs) || event.atMs < 0)
        return reject("invalid_attempt");
      if (state.observations.some(obs => obs.attemptId === event.attemptId))
        return reject("duplicate_attempt");
      if (state.phase === "TRANSFERIR" &&
          (event.taskId !== state.transferTaskId || event.contextId !== state.transferContextId))
        return reject("unexpected_transfer_task");
      const valid = trustedAssessor(event.assessor);
      const outcome = valid ? event.outcome : "not_evaluable";
      const obs: CALObservation = {
        attemptId: event.attemptId, taskId: event.taskId, contextId: event.contextId,
        stage: attemptPhase, outcome, assessor: event.assessor,
        assistance: event.assistance, observedAtMs: event.atMs,
      };
      const observations = [...state.observations, obs].slice(-MAX_OBSERVATIONS);
      if (state.phase === "PRATICAR") {
        if (outcome === "not_yet") {
          const errors = state.consecutiveErrors + 1;
          if (errors >= policy.reteachAfterErrors) {
            return accept({
              observations, phase: "ENSINAR", consecutiveErrors: 0,
              practiceReady: false, reteachCycles: state.reteachCycles + 1,
            }, state.reteachCycles + 1 > policy.maxReteachCycles
              ? "offer_pause_or_smaller_goal" : "reteach_with_different_strategy");
          }
          return accept({observations, consecutiveErrors: errors}, "practice_error");
        }
        if (outcome === "meets") return accept({
          observations, consecutiveErrors: 0,
          practiceReady: state.practiceReady || event.assistance === "none",
        }, "practice_success_not_mastery");
        if (outcome === "partial") return accept({
          observations, consecutiveErrors: 0,
        }, "practice_partial");
        return accept({observations}, "attempt_not_evaluable");
      }
      if (state.phase === "RETOMAR") {
        if (outcome === "meets" && event.assistance === "none") return accept({
          observations, retrievalReady: true,
        }, "recall_observed_not_certified");
        if (outcome === "not_evaluable") return accept({observations}, "recall_not_evaluable");
        return accept({
          observations, phase: "ENSINAR", retrievalReady: false,
          reteachCycles: state.reteachCycles + 1,
        }, "recall_needs_reteach");
      }
      if (outcome === "not_evaluable") return accept({observations}, "transfer_not_evaluable");
      return accept({
        observations, transferAttempted: true,
        transferIndependent: state.transferIndependent ||
          (outcome === "meets" && event.assistance === "none"),
      }, outcome === "meets" && event.assistance === "none"
        ? "transfer_observed_not_mastered" : "transfer_needs_more_evidence");
    }
    case "START_RECALL": {
      if (state.phase !== "PRATICAR" || state.lastTaughtAtMs === null ||
          !state.practiceReady || !Number.isFinite(event.atMs) ||
          event.atMs < state.lastTaughtAtMs)
        return reject("recall_not_ready");
      const elapsedMs = event.atMs - state.lastTaughtAtMs;
      return accept({phase: "RETOMAR", retrievalReady: false},
        elapsedMs >= policy.delayedRecallThresholdMs
          ? "delayed_recall_opportunity" : "immediate_recall_only");
    }
    case "START_TRANSFER": {
      if (!["PRATICAR", "RETOMAR"].includes(state.phase) ||
          !(state.practiceReady || state.retrievalReady))
        return reject("transfer_not_ready");
      if (!event.taskId.trim() || !event.contextId.trim() ||
          event.contextId === lastPracticeContext(state))
        return reject("transfer_context_not_new");
      return accept({
        phase: "TRANSFERIR", transferTaskId: event.taskId,
        transferContextId: event.contextId, transferAttempted: false,
        transferIndependent: false,
      }, "new_context_task");
    }
    case "SUMMARIZE": {
      if (state.phase !== "TRANSFERIR" || !state.transferAttempted)
        return reject("insufficient_transfer_observation");
      return accept({phase: "COMPROVAR"}, "bounded_evidence_summary_no_mastery");
    }
  }
  return reject("unsupported_event");
}

export type CALStrategy =
  | "brief_goal_question" | "translated_microexample" | "contextual_example"
  | "contrastive_reteach" | "guided_retrieval" | "recall_before_reveal"
  | "new_context_task" | "bounded_evidence_summary";
export type CALPreferences = Readonly<{
  needsPortugueseSupport: boolean; // explicit preference or trusted observation, not CEFR
  audioConsent: boolean;
  audioAvailable: boolean;
}>;
export type CALPlan = Readonly<{
  phase: CALState;
  strategy: CALStrategy;
  languageSupport: "pt-BR" | "mixed";
  optionalAudio: boolean;
  maxAdditionalModelCalls: 0;
}>;

/** Policy chooses HOW to teach. The LLM may formulate content, never bypass this decision. */
export function chooseCALPlan(state: CALSnapshot, prefs: CALPreferences): CALPlan {
  const map: Record<CALState, CALStrategy> = {
    OBSERVAR: "brief_goal_question",
    ENSINAR: state.reteachCycles > 0 ? "contrastive_reteach" :
      prefs.needsPortugueseSupport ? "translated_microexample" : "contextual_example",
    PRATICAR: "guided_retrieval",
    RETOMAR: "recall_before_reveal",
    TRANSFERIR: "new_context_task",
    COMPROVAR: "bounded_evidence_summary",
  };
  return {
    phase: state.phase,
    strategy: map[state.phase],
    languageSupport: prefs.needsPortugueseSupport ? "pt-BR" : "mixed",
    optionalAudio: prefs.audioConsent && prefs.audioAvailable,
    // Does not authorize extra model calls beyond the existing tutor reply.
    maxAdditionalModelCalls: 0,
  };
}

/** Synthetic report. There is deliberately NO "learned"/CEFR/mastery field. */
export function summarizeCAL(state: CALSnapshot) {
  const trusted = state.observations.filter(obs => trustedAssessor(obs.assessor));
  const independent = trusted.filter(obs => obs.outcome === "meets" && obs.assistance === "none");
  const contexts = new Set(independent.map(obs => obs.contextId));
  return {
    independentAttempts: independent.length,
    distinctObservedContexts: contexts.size,
    retrievalAttempts: trusted.filter(obs => obs.stage === "RETOMAR").length,
    transferAttempts: trusted.filter(obs => obs.stage === "TRANSFERIR").length,
    requiresFormalReview: contexts.size >= 3,
    // A prompt, rubric-less LLM judgment, or three repetitions never certify.
    certification: "not_assessed" as const,
  };
}

/** Candidate ONLY. No storage or SRS APIs are referenced by this module. */
export function proposeSRSFromError(obs: CALObservation): Readonly<{
  kind: "review_candidate"; taskId: string; requiresLearnerConsent: true;
}> | null {
  if (obs.outcome !== "not_yet" || !trustedAssessor(obs.assessor)) return null;
  return {kind: "review_candidate", taskId: obs.taskId, requiresLearnerConsent: true};
}

/** Contract for a future CSLE adapter; no engine is instantiated in Fase 01. */
export interface PedagogicalEngine {
  propose(snapshot: CALSnapshot): Promise<readonly Readonly<{
    type: "explain" | "practice" | "review_candidate" | "transfer";
    objectiveId: string;
  }>[]>;
}
