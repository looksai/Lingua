# Lingua — P0 learner memory with explicit consent

**Status: review candidate, not deployed.** Branch `feat/p0-learner-memory-consent`. No automatic multi-agent extraction, vector database, or CSLE coupling.

## Feature gate / database

The actual repository uses **MySQL + Drizzle + mysql2** on Aiven, NOT PostgreSQL.
Run `drizzle/0007_learner_memories.sql` **manually in reviewed staging only** after verifying approved 0005 and 0006 migrations, correct Aiven database identity, schema drift and TLS. Do not run `db:push`; `drizzle/meta/_journal.json` does not describe these manual migrations. Keep `LINGUA_TUTOR_MEMORY_ENABLED` absent or false until staging DDL and QA pass. Do not activate production without explicit founder/Deep release approval. Back out by turning flag off; table drop requires an independently approved retention/rollback decision.

## Flow

1. Student expressly authorizes sending messages to the selected AI provider. If memories are enabled, provider consent uses version **v2**, because approved memories may be sent as additional context.
2. The existing Groq/OpenAI text call can return a JSON object with `resposta` and optionally `memoria` containing exactly one verbatim, first-person quote from the **current student message**. All candidate data is untrusted; server checks exact substring, category, format, and a conservative privacy filter. Malformed output cannot write memory.
3. Tutor chat asks: “Posso guardar este detalhe ...?” Buttons: **Sim, guardar / Não guardar**. Simply sending a message, enabling chat, or dismissing the prompt does not store a memory.
4. On a separate authenticated, origin-checked `tutor.memorySave` mutation with `consent:true`, the server inserts the exact self-declared quote, category, `aluno_confirmou_no_chat` origin, userId, timestamp, and dedup key. Retried consent is idempotent. No original full message is persisted in this memory table.
5. Before each enabled provider chat reply, the server loads at most five newest facts belonging to `ctx.user.id`. It injects them as **untrusted quoted data** for personalization, never as certification or official evidence. The existing learner-claim guard accepts user-confirmed memory as *student assertion* only.
6. In conversation settings the learner can list up to 100 saved facts, delete one, or delete all. Memory is independent of 30-day browser conversation history, onboarding, diagnostic observations, SRS and CSLE.

## Quality / security gates before rollout

- Approve manual staging migration (ownership indexes, uniqueness, foreign key, cascade) and rehearse a rollback.
- Test isolation across two accounts, including retrieval, delete-by-ID of another user's memory, logout/login and a second browser.
- Test direct API calls with `consent:false`/missing or malformed bodies, CSRF, spoofed userId, duplicate submissions, response failures, SQL downtime, and long/sensitive user text.
- Test conflicting facts (“I work in sales” and later “I changed to welding”): the MVP stores claims, not canonical truth. Student can delete outdated facts. A later reconciliation mechanism requires its own design.
- Inspect the model JSON response and prompts with the currently configured Groq model; run QA for provider model switches and response truncation.
- Confirm privacy notice, legal basis, revocation flow and processor disclosures (Groq/OpenAI/Aiven) with local counsel. LGPD does not make consent the only legal basis for every personal-data operation; this feature deliberately chooses explicit opt-in.
- Review policies for minors, retention, backup deletion, data access/export, customer support and sensitive data exclusion; the conservative regex is **not** complete sensitive-data protection.
- Run `pnpm check`, `pnpm test`, `pnpm build` and the staging smoke tests before enabling the flag.

No promotion of LLM text to official curriculum, evidence, grades, CEFR, CSLE or SRS is permitted.
