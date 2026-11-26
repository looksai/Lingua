# Lingua Community — foundation (not released)

## Product boundaries
- Active plan required for student community access. Cancellation/inactive or expired entitlement cuts access; do not infer entitlement from login, onboarding or client-side payment state.
- Proposed groups: immigration, jobs/career, travel, IELTS and Express Entry. Peer coordinators and companies require separate verified permissions. No public social network, direct messages, live video, job publication or ads are enabled by this branch.
- Design uses approved Academy interior tokens and assets, without changing the approved home.
- Conservative initial policy: only verified active subscription with future validity; trial/grace periods require a separate commercial decision. Billing adapter must translate cancellation semantics explicitly, never assume access after cancellation.

## Current implementation
server/community-access.ts and tests implement only a pure server-side authorization decision. They are not connected to an endpoint or real billing. The Academy candidate 951367a's server/routers.ts does not expose a billing router; inspect/reconcile the historical billing implementation before connecting an entitlement adapter. No new schema, database or payment changes.

## Next increments
1. Reconcile billing authority and revocation semantics; define server-side entitlement lookup from verified session. Deny on lookup error; no client-supplied userId or status.
2. Implement read-only group catalog with server guard and tests of disabled/expired/canceled/cross-account cases; add branded community page only after access contract is available.
3. Define moderated posts, reports, rate limits, role segregation and privacy; company/job channels and peer coordinator roles require separate approval. No fake membership or metrics.
4. Isolated browser and MySQL labs before release. No production migration, merge or deploy without review.

Separate branch from 951367a keeps the currently validated Academy visual release candidate untouched. Tests newly authored, not yet executed in CI.
