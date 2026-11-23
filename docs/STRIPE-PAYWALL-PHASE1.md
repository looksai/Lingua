# Stripe paywall — implementation candidate, phase 1 (OFF by default)

**Status:** draft implementation, NOT functional billing. Billing disabled unless explicit `STRIPE_BILLING_ENABLED=true`. No Stripe SDK, checkout, webhook endpoint, paid usage gating, billing UI or database migration has been deployed by this branch. Do NOT merge or use in production before full audit.

## Prepared
- `drizzle/0008_billing_staging.sql`: proposal with isolated `billingCustomers`, `billingSubscriptions`, `stripeWebhookEvents`, `tutorTrialState`, `tutorUsage`.
- `drizzle/schema.ts`: matching Drizzle definitions.
- `server/billing-policy.ts`: pure, nonexecuting policy functions for subscription entitlement (verified paid-through + current period + valid price) and 72h/20-successful-replies product trial.
- Unit tests for cancellation, mismatch, expiration, failed status and quota. **No payment API is called.**

## Required next work, after memory is validated and Deep approves
1. Audit schema and provision `0008` to verified Aiven staging with backup and a separately approved manual workflow. Do NOT run `db:push`.
2. Pin Stripe Node SDK and API version; compare the latest Subscription and SubscriptionItem structures. Since Stripe's Basil update removed subscription-level `current_period_end`, derive `currentPeriodEnd` from the correct subscription item period. Validate checkout's Price ID is recurring monthly and allowed in server configuration.
3. Implement authenticated `billing.status`, `billing.createCheckout`, `billing.createPortalSession` and raw-body signed `POST /api/billing/stripe-webhook`. Validate signature, event customer ownership and subscription price by retrieving Stripe live state. Durable idempotent processing, durable paid-through reconciliation, transactional recovery for out-of-order events.
4. Implement server-atomic and idempotent quota reservations before tutor `reply`, `transcribe` and neural `TTS`; count only successful AI replies toward trial, while separately bounding costly media.
5. Implement front-end paywall/restore billing status. Redirect to Stripe Checkout only; never promote on `success_url`.
6. Test Stripe sandbox, event duplicates/out-of-order, failed payment, cancellation, multi-tab quota race, ownership isolation, webhook signature forgery, replay, timeout and user-initiated deletion/retention controls. Keep separate test/live Price IDs and secrets.
7. Obtain founder + Deep go/no-go before enabling the flag, live payment or opening registration.

## Safeguard / commercial accuracy
`US$9.90` is a *proposal* for a monthly price; final pricing, tax obligations, cost of text, audio and ASR, refund/cancellation terms and fraud limits must be reviewed. Groq/Gemini free quotas are for staging and cannot be assumed sustainable for a live paying user base.

This PR is separated from the memory migration, the frozen CSLE and the current Render deployment.
