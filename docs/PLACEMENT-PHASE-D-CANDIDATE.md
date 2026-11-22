# Phase D candidate — optional placement: decision memo for Deep

**Status (22 Nov 2026): Draft PR; do not merge or deploy until migration, pedagogy, and privacy are approved.**

## What exists in the PR

- Three independent optional prompts that collect *written English* or a user-reviewed ASR transcript. They observe a small part of writing only; ASR does not prove oral skills, and three answers are **not** CEFR A1–C1 validation.
- The founder can begin the questionnaire in TutorChat or from the dashboard; answers are idempotently saved in a separate `learnerPlacementAnswers` table, keyed by user and task. A 4-week *provisional* plan is suggested by Groq (explicit consent, no OpenAI calls) or by a deterministic transparent fallback, validated by Zod and saved in `learnerPlacementPlans`.
- Dashboard shows the proposed plan, explicit uncertainties, and ways to check it. **No automatic curriculum change, no official evidence, no CEFR, no claimed ASR pronunciation evaluation, no SRS or CSLE changes.**
- `placement.clear` lets the authenticated student erase these provisional records. Not yet an approved production retention or consent ledger.

## Review gates: block before deployment

1. **DB:** `drizzle/0006_placement_staging.sql` has not been applied. Confirm schema/TLS/target/privileges and staging scope, obtain explicit founder & Deep migration approval, apply manually with independent verification. Reconcile any drift; do not run `db:push` or touch another service.
2. **API:** Run realistic Groq JSON mode and timeout/429/401/403/500 tests with fictional data, never a paid fallback. Mock CI is not proof of live API capability.
3. **Pedagogy:** Review prompts with qualified language educators and test beginner/intermediate learners. Validate stability, assistance flagging and what is **not** measured. Add targeted reading, listening, independent speaking, and rubric-based tasks before any CEFR claims.
4. **Privacy:** Separate data from SRS/official evidence. Check per-user isolation, deletion/export, revocation, storage duration, lawful basis, and consent information on the founder's device; do not publish real student data to free providers. Current `allowlist` is not a substitute for verified identity.
5. **Flow and UX:** Browser E2E for three steps, pause/resume, ASR correction before submission, concurrent tabs, reload, no transcript leakage, reversible plan, error handling and accessibility.
6. **Official curriculum:** If a future plan should drive automatic task sequencing, define the authoritative curriculum competency mapping and student-approved transition separately. The current dashboard displays a suggestion only, not an autonomous scheduling engine.

## Future path to actual assessment

Use competency-tagged, difficulty-graded reading and listening tasks; writing samples with traceable assistance; supervised speaking tasks and rubrics; version all items and raters, include uncertainty, and calibrate to CEFR if CEFR labeling is desired. SRS remains scheduling only. CSLE suggestions must be screened by the Lingua authority.

References:
- https://www.coe.int/en/web/common-european-framework-reference-languages/assessment
- https://www.coe.int/en/web/lang-migrants/cefr-and-profiles
- https://console.groq.com/docs/structured-outputs
