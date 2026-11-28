import type {IeltsVariant} from "./exam-contract";
export const INTEGRATED_VERSION="ielts-integrated-practice-v1-2026-11-28";
export const INTEGRATED_STAGES=["listening","reading","writing","speaking"] as const;
export type IntegratedStage=typeof INTEGRATED_STAGES[number];
export type IntegratedOutcome={stage:IntegratedStage;status:"completed"|"expired"|"skipped"};
export type IntegratedSession={variant:IeltsVariant;outcomes:readonly IntegratedOutcome[]};
export function integratedStage(session:IntegratedSession):IntegratedStage|null{
 return INTEGRATED_STAGES[session.outcomes.length]??null;
}
export function advanceIntegrated(session:IntegratedSession,outcome:IntegratedOutcome):IntegratedSession{
 if(integratedStage(session)!==outcome.stage)throw new Error("Unexpected integrated practice stage");
 return {...session,outcomes:[...session.outcomes,outcome]};
}
