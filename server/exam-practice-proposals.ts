import {completedExamActivity,type CompletedExamActivity} from "../shared/exam-history-contract";
import {IELTS_ADAPTER_VERSION,EXAM_SKILLS,type IeltsVariant,type ExamSkill} from "../shared/exam-contract";
import {EXAM_PROPOSAL_VERSION,examPracticeProposal,type ExamPracticeProposal} from "../shared/exam-practice-proposals";
import {examExercises} from "./exam-engine";

export function examProposalsEnabled(env:NodeJS.ProcessEnv=process.env){return env.LINGUA_EXAM_PROPOSALS_ENABLED==="true";}
/** A deterministic local baseline, NOT CSLE. No external calls, curriculum mutation,
 * proficiency inference, SRS changes or evidence publication. Only current-version,
 * same-variant objective practice, most recent attempt per distinct set. */
export function proposeExamPractice(variant:IeltsVariant,history:readonly CompletedExamActivity[]):ExamPracticeProposal[]{
 const output:ExamPracticeProposal[]=[];
 for(const skill of EXAM_SKILLS){
  const catalogue=examExercises(variant,skill);
  const eligible=history.slice(0,50).filter(row=>completedExamActivity.safeParse(row).success&&row.variant===variant&&row.skill===skill&&row.contentVersion===IELTS_ADAPTER_VERSION&&row.mode==="practice"&&row.total===4&&catalogue.some(t=>t.id===row.exerciseId));
  const latest=new Map<string,CompletedExamActivity>();
  for(const row of eligible){const prev=latest.get(row.exerciseId);if(!prev||row.completedAtMs>prev.completedAtMs||(row.completedAtMs===prev.completedAtMs&&row.attemptId>prev.attemptId))latest.set(row.exerciseId,row);}
  const unseen=catalogue.find(t=>!latest.has(t.id));
  const observed=[...latest.values()];
  const missed=observed.filter(r=>r.correct<r.total).sort((a,b)=>a.correct-b.correct||a.completedAtMs-b.completedAtMs||a.exerciseId.localeCompare(b.exerciseId))[0];
  const oldest=observed.sort((a,b)=>a.completedAtMs-b.completedAtMs||a.exerciseId.localeCompare(b.exerciseId))[0];
  const next=unseen??missed??oldest;
  if(!next)continue;
  output.push(examPracticeProposal.parse({version:EXAM_PROPOSAL_VERSION,source:"lingua-local-rule",variant,skill,exerciseId:"exerciseId" in next?next.exerciseId:next.id,reason:unseen?(latest.size===0?"explore-unsampled":"practice-more-contexts"):missed?"review-missed-items":"vary-practice",observedDistinctSets:latest.size,authority:"practice-only"}));
 }
 return output;
}
