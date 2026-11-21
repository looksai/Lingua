import { describe, expect, it } from "vitest";
import { diagnosticQuestions, foundationLessons, gradeQuestions, publicQuestions } from "./first-steps";

describe("Lingua first-contact learning flow", () => {
  it("does not expose answer keys with public questions", () => {
    for (const question of publicQuestions(diagnosticQuestions)) {
      expect(Object.keys(question).sort()).toEqual(["choices", "id", "prompt"]);
      expect(question.choices).toHaveLength(3);
    }
    for (const lesson of foundationLessons) {
      expect(publicQuestions(lesson.questions)).toHaveLength(3);
    }
  });

  it("calculates baseline and lesson scores only from submitted answers", () => {
    expect(gradeQuestions(diagnosticQuestions, diagnosticQuestions.map(q => q.correct))).toBe(6);
    expect(gradeQuestions(diagnosticQuestions, diagnosticQuestions.map(q => (q.correct + 1) % 3))).toBe(0);
    for (const lesson of foundationLessons) {
      expect(gradeQuestions(lesson.questions, lesson.questions.map(q => q.correct))).toBe(3);
      expect(gradeQuestions(lesson.questions, lesson.questions.map(q => (q.correct + 1) % 3))).toBe(0);
    }
  });

  it("starts every learner from the same first lesson, with no pre-completed units", () => {
    expect(foundationLessons.map(lesson => lesson.key)).toEqual(["pronouns", "to-be", "questions"]);
    expect(new Set(foundationLessons.flatMap(lesson => lesson.questions.map(q => q.id))).size).toBe(9);
  });

  it("rejects incomplete answer sets", () => {
    expect(() => gradeQuestions(diagnosticQuestions, [0])).toThrow("Unexpected assessment length");
  });
});
