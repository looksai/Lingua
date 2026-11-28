import {z} from "zod";
import {EXAM_MODES,EXAM_SKILLS,IELTS_VARIANTS} from "./exam-contract";
export const examGoalInput=z.object({
 variant:z.enum(IELTS_VARIANTS),
 targetBandHalfSteps:z.number().int().min(0).max(18).nullable(),
 targetDate:z.iso.date().nullable()
}).strict();
export type ExamGoalInput=z.infer<typeof examGoalInput>;
export const completedExamActivity=z.object({
 attemptId:z.uuid(),
 variant:z.enum(IELTS_VARIANTS),skill:z.enum(EXAM_SKILLS),mode:z.enum(EXAM_MODES),
 exerciseId:z.string().min(1).max(80),contentVersion:z.string().min(1).max(80),
 correct:z.number().int().min(0).max(40),total:z.number().int().min(1).max(40),
 completedAtMs:z.number().int().positive().max(8640000000000000)
}).strict().refine(v=>v.correct<=v.total).refine(v=>v.skill!=="listening"||v.mode==="practice");
export type CompletedExamActivity=z.infer<typeof completedExamActivity>;
