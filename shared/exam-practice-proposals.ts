import {z} from "zod";
import {EXAM_SKILLS,IELTS_VARIANTS} from "./exam-contract";
export const EXAM_PROPOSAL_VERSION="exam-practice-proposals-v1";
export const examPracticeProposal=z.object({
 version:z.literal(EXAM_PROPOSAL_VERSION),source:z.literal("lingua-local-rule"),
 variant:z.enum(IELTS_VARIANTS),skill:z.enum(EXAM_SKILLS),
 exerciseId:z.string().min(1).max(80),
 reason:z.enum(["explore-unsampled","practice-more-contexts","review-missed-items","vary-practice"]),
 observedDistinctSets:z.number().int().min(0).max(50),
 authority:z.literal("practice-only")
}).strict();
export type ExamPracticeProposal=z.infer<typeof examPracticeProposal>;
