import { describe, expect, it } from "vitest";
import {
  firstAccessTasks, interestLabels, provisionalPath, supportedFirstAccessLanguages, tutorPersonaLabels,
} from "../shared/onboarding";
import { appRouter } from "./routers";

describe("First access: honest and isolated", () => {
  it("uses five bounded unique tasks and distinguishes sampled abilities", () => {
    expect(firstAccessTasks).toHaveLength(5);
    expect(new Set(firstAccessTasks.map(task => task.id)).size).toBe(5);
    expect(firstAccessTasks.every(task => task.skill === "writing" || task.skill === "reading")).toBe(true);
    expect(firstAccessTasks.some(task => task.skill === "writing")).toBe(true);
    expect(firstAccessTasks.some(task => task.skill === "reading")).toBe(true);
  });
  it("does not fabricate fluency or full assessment in plans", () => {
    for (const interest of Object.keys(interestLabels) as Array<keyof typeof interestLabels>) {
      const plan = provisionalPath(interest);
      expect(plan.reason).toMatch(/explorat[oó]rio/i);
      expect(plan.limits).toMatch(/n[aã]o foram avaliadas/i);
      expect(plan.title).not.toMatch(/B[12]|fluente|dom[ií]nio/i);
    }
    expect(supportedFirstAccessLanguages.interfaceLocale).toBe("pt-BR");
    expect(supportedFirstAccessLanguages.nativeLanguage).toBe("pt");
    expect(supportedFirstAccessLanguages.targetLanguage).toBe("en");
    expect(Object.keys(tutorPersonaLabels)).toContain("neutral");
  });
  it("protects learner profile and diagnosis behind authentication", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.onboarding.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.onboarding.defer()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.onboarding.resume()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.onboarding.submit({
      taskId: firstAccessTasks[0].id, answer: "Hello!",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
