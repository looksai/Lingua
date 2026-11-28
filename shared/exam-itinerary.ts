import { z } from "zod";
import { IELTS_VARIANTS } from "./exam-contract";
import { INTEGRATED_STAGES, INTEGRATED_VERSION } from "./exam-integrated-contract";

// A personal bookmark. Scores, answers, recordings and drafts are never accepted.
export const itineraryBookmark = z.object({
  version: z.literal(INTEGRATED_VERSION),
  variant: z.enum(IELTS_VARIANTS),
  statuses: z.array(z.enum(["completed", "expired", "skipped"])).min(1).max(INTEGRATED_STAGES.length),
}).strict();
export const saveItineraryInput = z.object({
  accountId: z.number().int().positive(),
  consent: z.literal(true),
  expectedRevision: z.uuid().nullable(),
  bookmark: itineraryBookmark,
}).strict();
