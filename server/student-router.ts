import { and, eq, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { learnerLessonResults, learnerProfiles } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { diagnosticQuestions, foundationLessons, gradeQuestions, publicQuestions } from "./first-steps";

const goal = z.enum(["work", "travel", "everyday", "study", "other"]);
const exposure = z.enum(["none", "some", "comfortable"]);
const lessonKey = z.enum(["pronouns", "to-be", "questions"]);

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Banco indisponível" });
  return db;
}

export const studentRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await requiredDb();
    const [profile] = await db.select().from(learnerProfiles)
      .where(eq(learnerProfiles.userId, ctx.user.id)).limit(1);
    const results = profile ? await db.select().from(learnerLessonResults)
      .where(eq(learnerLessonResults.userId, ctx.user.id)) : [];
    return {
      profile: profile ? {
        displayName: profile.displayName,
        studyGoal: profile.studyGoal,
        priorExposure: profile.priorExposure,
        baselineScore: profile.baselineScore,
        baselineTotal: profile.baselineTotal,
        baselineCompletedAt: profile.baselineCompletedAt,
      } : null,
      diagnostic: publicQuestions(diagnosticQuestions),
      lessons: foundationLessons.map(lesson => ({
        key: lesson.key,
        title: lesson.title,
        objective: lesson.objective,
        explanation: lesson.explanation,
        examples: lesson.examples,
        questions: publicQuestions(lesson.questions),
      })),
      results: results.map(result => ({
        lessonKey: result.lessonKey,
        bestScore: result.bestScore,
        total: result.total,
        completedAt: result.completedAt,
      })),
    };
  }),

  createProfile: protectedProcedure.input(z.object({
    displayName: z.string().trim().min(2).max(80),
    studyGoal: goal,
    priorExposure: exposure,
  })).mutation(async ({ ctx, input }) => {
    const db = await requiredDb();
    // Do not overwrite an established student profile or baseline on retry.
    await db.insert(learnerProfiles).values({
      userId: ctx.user.id,
      displayName: input.displayName,
      studyGoal: input.studyGoal,
      priorExposure: input.priorExposure,
    }).onDuplicateKeyUpdate({ set: { userId: ctx.user.id } });
    return { success: true as const };
  }),

  submitDiagnostic: protectedProcedure.input(z.object({
    answers: z.array(z.number().int().min(0).max(2)).length(diagnosticQuestions.length),
  })).mutation(async ({ ctx, input }) => {
    const db = await requiredDb();
    const [profile] = await db.select().from(learnerProfiles)
      .where(eq(learnerProfiles.userId, ctx.user.id)).limit(1);
    if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete primeiro seu perfil" });
    if (profile.baselineCompletedAt) {
      return { score: profile.baselineScore ?? 0, total: diagnosticQuestions.length, alreadyCompleted: true };
    }
    const score = gradeQuestions(diagnosticQuestions, input.answers);
    // First result wins; this is a baseline indicator, not certification/evidence.
    await db.update(learnerProfiles).set({
      baselineScore: score,
      baselineTotal: diagnosticQuestions.length,
      baselineCompletedAt: new Date(),
    }).where(and(eq(learnerProfiles.userId, ctx.user.id), isNull(learnerProfiles.baselineCompletedAt)));
    return { score, total: diagnosticQuestions.length, alreadyCompleted: false };
  }),

  submitLesson: protectedProcedure.input(z.object({
    lessonKey,
    answers: z.array(z.number().int().min(0).max(2)).length(3),
  })).mutation(async ({ ctx, input }) => {
    const db = await requiredDb();
    const [profile] = await db.select().from(learnerProfiles)
      .where(eq(learnerProfiles.userId, ctx.user.id)).limit(1);
    if (!profile?.baselineCompletedAt) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Conclua a avaliação inicial antes da aula" });
    const index = foundationLessons.findIndex(lesson => lesson.key === input.lessonKey);
    if (index < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Aula desconhecida" });
    if (index > 0) {
      const [previous] = await db.select().from(learnerLessonResults).where(and(
        eq(learnerLessonResults.userId, ctx.user.id),
        eq(learnerLessonResults.lessonKey, foundationLessons[index - 1].key)
      )).limit(1);
      if (!previous?.completedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Conclua a aula anterior" });
    }
    const lesson = foundationLessons[index];
    const score = gradeQuestions(lesson.questions, input.answers);
    const total = lesson.questions.length;
    const passed = score === total;
    await db.insert(learnerLessonResults).values({
      userId: ctx.user.id,
      lessonKey: input.lessonKey,
      bestScore: score,
      total,
      completedAt: passed ? new Date() : null,
    }).onDuplicateKeyUpdate({ set: {
      bestScore: sql`GREATEST(${learnerLessonResults.bestScore}, ${score})`,
      completedAt: passed
        ? sql`COALESCE(${learnerLessonResults.completedAt}, NOW())`
        : sql`${learnerLessonResults.completedAt}`,
    } });
    return { score, total, passed };
  }),
});
