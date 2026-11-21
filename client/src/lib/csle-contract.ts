export type EvidenceKind =
  | "recognition"
  | "comprehension"
  | "retrieval"
  | "application"
  | "transfer";

export type EvidenceStatus = "hypothesis" | "implemented" | "simulated" | "tested";

export type LearningObservation = {
  source: "student" | "interaction" | "system";
  date: string;
  context: string;
  kind: EvidenceKind;
  attempts: number;
  assistance: "none" | "light" | "guided";
  correct: boolean;
  confidence: number;
};

export type Anchor = {
  id: string;
  title: string;
  objective: string;
  prerequisiteIds: string[];
  coverage: "required" | "optional";
};

export type EngineLimits = {
  allowPersonalization: boolean;
  allowExternalMedia: boolean;
  maxExplorationMinutes: number;
  requireReturnPoint: boolean;
  consentVersion: string;
};

export type EngineInput = {
  sessionId: string;
  anchor: Anchor;
  observations: LearningObservation[];
  interests: string[];
  limits: EngineLimits;
};

export type EligibleAction = {
  id: string;
  type: "practice" | "explain" | "explore" | "return" | "pause";
  title: string;
  reason: string;
  estimatedMinutes: number;
  evidenceStatus: EvidenceStatus;
  requiresConsent: boolean;
};

export type EngineDecision = {
  selectedActionId: string;
  actions: EligibleAction[];
  uncertainty: "low" | "medium" | "high";
  rationale: string;
  returnPoint: string;
  audit: {
    createdAt: string;
    implementation: "mock-csle" | "csle-engine";
    authority: "proposal-only";
    excludedActions: string[];
  };
};

export interface PedagogicalEngine {
  decide(input: EngineInput): Promise<EngineDecision>;
}

export const demoInput: EngineInput = {
  sessionId: "demo-session-001",
  anchor: {
    id: "be-forms",
    title: "am / is / are",
    objective: "Usar o verbo to be em afirmações, negativas e perguntas.",
    prerequisiteIds: ["pronouns", "singular-plural"],
    coverage: "required",
  },
  observations: [
    {
      source: "interaction",
      date: "2026-11-20",
      context: "ferramentas e oficina",
      kind: "comprehension",
      attempts: 1,
      assistance: "light",
      correct: true,
      confidence: 0.71,
    },
  ],
  interests: ["mecânica", "comunicação profissional"],
  limits: {
    allowPersonalization: true,
    allowExternalMedia: true,
    maxExplorationMinutes: 8,
    requireReturnPoint: true,
    consentVersion: "demo-1",
  },
};

export const mockDecision: EngineDecision = {
  selectedActionId: "practice-transfer",
  actions: [
    {
      id: "practice-transfer",
      type: "practice",
      title: "Testar em um contexto novo",
      reason: "A compreensão já apareceu em contexto familiar; falta observar transferência.",
      estimatedMinutes: 4,
      evidenceStatus: "simulated",
      requiresConsent: false,
    },
    {
      id: "explore-workshop",
      type: "explore",
      title: "Abrir uma espiral sobre ferramentas",
      reason: "Seu interesse declarado pode oferecer uma ponte curta para recuperar o vocabulário.",
      estimatedMinutes: 6,
      evidenceStatus: "hypothesis",
      requiresConsent: true,
    },
    {
      id: "pause",
      type: "pause",
      title: "Pausar e retomar depois",
      reason: "Pausa é sempre uma opção legítima quando o custo da sessão sobe.",
      estimatedMinutes: 0,
      evidenceStatus: "implemented",
      requiresConsent: false,
    },
  ],
  uncertainty: "medium",
  rationale: "O próximo passo deve ampliar a evidência sem apagar a âncora curricular.",
  returnPoint: "be-forms",
  audit: {
    createdAt: "2026-11-20T07:15:00Z",
    implementation: "mock-csle",
    authority: "proposal-only",
    excludedActions: ["certify-domain", "infer-diagnosis", "force-context-switch"],
  },
};

export const mockEngine: PedagogicalEngine = {
  async decide() {
    return mockDecision;
  },
};
