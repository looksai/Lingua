# Public partner live invitations — product requirement

Status: founder requested public invitation links on 2026-11-25; implementation pending. Other details below are proposed, not approved commercial terms.

## Goal
Partners can share a per-event URL externally. Visitors can enter Lingua and watch designated public live events without a paid subscription. The event becomes a discovery channel for Lingua.

## Proposed MVP
- Partner-owned event with title, schedule, public/private visibility and opaque public slug.
- Public landing page with partner identity, Lingua branding, schedule and player when live. No automatic account creation or required payment for public viewing.
- Server-side visibility and publication checks; unpublished/private events cannot be exposed through a public slug. Revocable link and event cancellation.
- Optional registration for chat and explicit separate opt-in for partner contact; no automatic transfer of student data or learning records.
- Optional CTA to create a Lingua account and try the tutor; attribution by event ID with privacy-preserving aggregate metrics.
- Rate limits, moderation, abuse reporting, safe embed allowlist, no arbitrary HTML or untrusted URLs.
- Prefer managed streaming/embed for MVP after cost and provider review; no self-hosted video infrastructure or paid provider commitment yet.

## Acceptance gates
Public event accessible anonymously; private/draft/cancelled event inaccessible; tenant isolation; revocation effective; no PII exposed; consent required for lead sharing; attribution does not imply consent; mobile and desktop playback QA; cost and capacity review before launch.

No pricing decisions, migrations, provider provisioning or deployment authorized by this document. Keep implementation separate from tutor consent changes.
