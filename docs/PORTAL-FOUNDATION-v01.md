# Lingua Portal — public foundation v0.1

## Scope delivered
- Public entry at `/portal`, six stable discovery themes at `/portal/tema/:slug`, an institutional information page at `/portal/parceiros`.
- Works without an account; links to existing `/login` and learner application remain intact.
- No invented company listings, member activity, migration programs, job vacancies, success rates, discounts or prices.
- Clear distinctions between public discovery and as-yet-unavailable private groups, institutional listing and contact workflows.
- No API, database or migration changes. The React components implement navigable content; they are **not** a launched forum or B2B product.
- Existing `/demo` and student routes are unchanged.
- Project identity: Lingua.

## Explicit release blockers for real community participation
1. Member entitlement design: independent Club ownership, limited Academy access, 12/18-month loyalty award hypothesis, cancellation and refund handling. Do not infer access from a login or payment alone.
2. Moderation, report/appeal, spam rate limits, rules of conduct, retention, and safe file uploads. Private content must never be served by public endpoints.
3. Forums: DB schema, approved topics/comments, ownership, role-based group moderation, edits/deletes, robust browser and MySQL tests.
4. Verified partner identities, jurisdiction and professional eligibility checks, opt-in lead/contact flows, separation of paid promotion and educational ranking.
5. Stripe/webhook only after commercial ratification; do not set prices here.
6. Product privacy and terms reviewed before any personal-data collection; no marketing/training use from learner memory consent.
7. Approved asset package `Lingua_Kit_Visual_Web_Designer.zip` is locally available to the founder but the connector only writes UTF-8, not binary assets. This PR uses typography/colors as a first integration and does not claim pixel-perfect reproduction or upload unverified imagery.

## Safety
Do not deploy this draft as public production without product/terms review. This PR intentionally remains separate from unmerged signup/memory PR #75.
