import { academyTrialStatus, trialGatedPath } from "./academy-trial";
import { commercialBenefits, type CommercialBenefit } from "../shared/commercial-entitlements";

type User = { id: number; createdAt?: Date };

export async function readCommercialBenefits(userId: number) {
  const { getDb } = await import("./db");
  const { commercialRepository } = await import("./commercial-repository-lab");
  const db = await getDb();
  if (!db) throw Error("Commercial database unavailable");
  const records = await commercialRepository(db).listForOwner(userId);
  return commercialBenefits(userId, records, Date.now());
}

export async function resolveLearningAccess(
  user: User,
  read: (id: number) => Promise<CommercialBenefit[]> = readCommercialBenefits,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
) {
  const trial = academyTrialStatus(user.createdAt, env, now);
  const legacy = trial.kind === "active" || trial.kind === "disabled";
  const benefits = !legacy && env.LINGUA_COMMERCIAL_LAB_ENABLED === "true" ? await read(user.id) : [];
  return {
    trial,
    course: legacy || benefits.includes("course"),
    tutor: legacy || benefits.includes("tutor"),
    exams: legacy || benefits.includes("exams"),
    community: benefits.includes("community"),
  };
}

export async function learningAccess(path: string, user: User) {
  if (!trialGatedPath(path)) return true;
  const access = await resolveLearningAccess(user);
  const scope = path.split(".")[0];
  return scope === "exams" ? access.exams : scope === "tutor" ? access.tutor : access.course;
}
