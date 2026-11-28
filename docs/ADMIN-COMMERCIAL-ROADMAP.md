# Lingua Admin — founder requirements
Status: complementary workstream approved by founder; no production activation.
Academy, integrated exams, gamification and community retain their existing priorities. Admin consumes their authoritative services rather than replacing them.

## Modules
- Executive dashboard: registered users, active paid subscribers, trial users, companies, paid advertising campaigns, referral redemptions and conversions.
- Finance: recurring and realized revenue separately, refunds, expenses, AI costs, commissions, overdue balances, operating result. Separate BRL/USD/EUR; no implicit FX conversion.
- Users and companies: search, pagination, subscription status, authorized suspension, partner contracts.
- Lingua Ads: paid campaigns, spend, impressions, clicks, billing status.
- Referrals: code, attribution, conversion, commission and payout status.
- Promotions: percentage or fixed currency discount, plan eligibility, redemption window, total and per-owner limits, revocation.
- Trial coupons: exactly 30/60/90/120/150/180 days, duration starts at redemption, no automatic charge without separate authorization.
- Community moderation and immutable administrative audit trail.

## Implementation gates
1. Server-side administrator authorization (never UI-only), deny by default, no client role assignment. Separate read/write permissions and audit records. Verify existing auth model.
2. Authoritative commercial subscription repository and financial event model; no invented metrics or production payment activation.
3. Coupon issuance and atomic redemption, owner isolation, idempotency, concurrency and expiry tests. Distinguish revoking unused coupons from revoking granted access.
4. Read-only admin dashboard, then audited management mutations; paginate sensitive data, no raw learning texts or recordings.
5. Isolated MySQL and Chromium tests, review migration and rollback before any production activation.

Existing pilot exam allowlist is not proof of a paid subscription. CSLE remains untouched. No new paid infrastructure authorized.

## Coupon validity (founder requirement)
Both promotional and trial coupons have independent redemption validity from issuance: presets 3, 7, 15, 30, 60, 90, 180 and 365 days, plus custom positive duration or explicit expiry date. Server computes issuance-relative expiry; show exact timestamp before confirmation. A 3-day redemption window may grant 180 days of access. Expiry or revocation prevents new redemptions without shortening previously granted benefits. A year preset means 365 days; custom date supports calendar anniversaries.
