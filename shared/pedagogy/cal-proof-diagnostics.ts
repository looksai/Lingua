/**
 * CAL Fase 01 diagnostic only: separates synthetic controller candidates from
 * educational evidence established with real learners and a trusted host.
 *
 * Do not call this a CEFR/mastery evaluator. No client input, DB, SRS or CSLE.
 * Server-assembled task delivery is not a browser-render receipt.
 */
import {DEFAULT_CAL_POLICY,type CALObservation,type CALSnapshot,type CALPolicy} from "./cal-machine";

const trusted=(obs:CALObservation)=>obs.assessor==="rule"||obs.assessor==="human";
const independent=(obs:CALObservation)=>trusted(obs)&&obs.outcome==="meets"&&obs.assistance==="none";

export type CALProofDiagnostics=Readonly<{
  phase:string;
  practiceCandidate:boolean;
  delayedRecallCandidate:boolean;
  novelContextTransferCandidate:boolean;
  boundedSummaryCandidate:boolean;
  controllerSequenceCandidate:boolean;
  liveTutorValidated:false;
  certification:"not_assessed";
  outstanding:readonly string[];
}>;

/** Never promotes CAL's in-memory events to independently verified learner outcomes. */
export function diagnoseCALProof(state:CALSnapshot,policy:CALPolicy=DEFAULT_CAL_POLICY):CALProofDiagnostics {
  const practice=state.observations.filter(o=>o.stage==="PRATICAR"&&independent(o));
  const recalled=state.observations.some(o=>
    o.stage==="RETOMAR"&&independent(o)&&state.lastTaughtAtMs!==null&&
    Number.isFinite(o.observedAtMs)&&Number.isFinite(state.lastTaughtAtMs)&&
    o.observedAtMs>=state.lastTaughtAtMs+policy.delayedRecallThresholdMs);
  const earlierPracticeContexts=new Set(practice.map(o=>o.contextId));
  const transferred=state.observations.some(o=>
    o.stage==="TRANSFERIR"&&independent(o)&&!earlierPracticeContexts.has(o.contextId)&&
    earlierPracticeContexts.size>0);
  const summary=state.phase==="COMPROVAR";
  const blockers=[
    ...(!practice.length?["no_independent_practice_candidate"]:[]),
    ...(!recalled?["no_delayed_recall_candidate"]:[]),
    ...(!transferred?["no_independent_new_context_transfer_candidate"]:[]),
    ...(!summary?["no_bounded_controller_summary"]:[]),
    "no_trusted_browser_delivery_receipt",
    "no_verified_cross_session_retention",
    "no_authenticated_real_learner_QA",
    "no_comparator_experiment",
    "no_formal_assessment_or_certification",
  ];
  return {
    phase:state.phase,
    practiceCandidate:practice.length>0,
    delayedRecallCandidate:recalled,
    novelContextTransferCandidate:transferred,
    boundedSummaryCandidate:summary,
    controllerSequenceCandidate:practice.length>0&&recalled&&transferred&&summary,
    liveTutorValidated:false,
    certification:"not_assessed",
    outstanding:blockers,
  };
}
