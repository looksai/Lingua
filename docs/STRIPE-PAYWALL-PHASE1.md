# Stripe paywall — branch for Deep audit (staging only)

**Status: draft PR #32, not merged, not deployed, not charging.** `STRIPE_BILLING_ENABLED` defaults to false. The founder has not configured Stripe secrets or approved billing live mode. Database migration `0008` is **not applied**.

## Implemented in this branch

- MySQL/Drizzle schema + manual-only `0008_billing_staging.sql`: Customer binding, subscriptions, webhook event receipts, trial counter, per-interaction usage, and idempotent checkout attempts.
- `server/billing-policy.ts`: derived Premium rights from current authorized Stripe Price ID, `active` status, period end and paid-through. Trial policy: **72 hours or 20 successful tutor responses**, starting on first successful reply.
- `server/stripe-http.ts`: **sandbox-only Stripe REST transport**, pinned API version `2026-09-30.endive`, explicit request idempotency keys and cryptographic `Stripe-Signature` verifier over original raw bytes (constant-time compare and five-minute timestamp tolerance).
- `server/billing-store.ts`: authenticated Stripe Customer association; server-only price allowlist, 35-minute checkout-intent lock with stable original request parameters; checkout creation, portal link, status query; signed webhook reconciliation under account-bound DB row lock, event-id deduplication and atomic MySQL writes.
- `server/billing-router.ts`: authenticated `billing.status`, `billing.createCheckout`, `billing.createPortalSession` with origin checks and preliminary rate limiting.
- `server/billing-webhook.ts` registered before `express.json()`, at `POST /api/billing/stripe-webhook`. For enabled sandbox: signature invalid → 400; temporary reconciliation failure → 503 so Stripe retries; success or duplicate → 200.
- `client/src/pages/Premium.tsx`: staging-only checkout and portal buttons, authoritative status display and `/billing/success` waiting state (never promotes on browser redirect).
- Tests: HMAC/raw body, Stripe subscription projection, account mismatch, stale/failed payment, duplicate event receipts and fallback policies.

## Important divergence from original design for explicit Deep review

The original `docs/PAYWALL-STRIPE.md` recommended the official **Stripe Node SDK** pinned in the lockfile. The current PR instead uses an isolated, **version-pinned HTTPS REST adapter** and Node's HMAC API to avoid adding an unreviewed dependency/lockfile from an offline development environment. This is an **implementation deviation**, not approval to ignore SDK guidance. Deep must approve the protocol-level adapter or require a follow-up switch to the official `stripe` SDK with a verified lockfile. Stripe API-version compatibility must be tested in sandbox.

## Outstanding gates before finalizing paywall

1. **First validate memory:** Founder runs approved guarded 0007 inspect; only after verified Aiven backup applies 0007, deploys memory to the correct Render staging service and tests opt-in persistence, reload and deletion. Neither workflow nor Render deploy has been triggered by this billing branch.
2. **Billing migration:** audit a separate safe Aiven staging workflow for `0008`, verify backup/0007/schema drift and execute manually. Never `db:push`.
3. **Durable tutor quota gate is NOT yet integrated:** `billing.status` can model a trial, but there is **no transactionally enforced 20-reply / 72-hour lock on live tutor calls**, and ASR/TTS need usage ceilings. It would be incorrect to claim a working paywall before this gate. Implement and test idempotency under multi-tab retries.
4. **Webhook and Stripe sandbox QA:** pin/validate API version, checkout + paid invoice + customer ownership, duplicate and out-of-order events, invoice failures, cancellation, customer Portal, missing subscription data, subscription item period and unusual plan/price state; test network timeouts and genuine SQL concurrency against disposable MySQL. Confirm event `parent.subscription_details.subscription` fields match configured endpoint version.
5. **Cancellation/refunds:** explicit rules for refunds/chargebacks, failed invoices, proration and state reconciliation are still required. Subscription status alone cannot substitute for paid-through evidence.
6. **Privacy/security:** no raw webhook payload logging, user-controlled memory stays separate, billing records have independent retention, protect rate limiting outside process, prevent account takeover and email misuse, verify user ownership and cancellation. Sandbox only, allowlisted user emails; do not use `sk_live_` keys.
7. **Business:** test gross margin for US$9.90/month with Groq ASR/Orpheus costs, Stripe fees, taxes, usage P95, refunds and support. Do not promise unlimited speech.

## Staging settings (ONLY after approval and migration)
- `STRIPE_BILLING_ENABLED=false` (remain OFF until sandbox QA)
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_PRICE_USD_MONTHLY=price_...` (price created in Stripe)
- `STRIPE_PRICE_BRL_MONTHLY=price_...` (optional)
- `STRIPE_BILLING_ALLOWED_EMAILS=...` (staging testers only)
- `PUBLIC_APP_URL=https://lingua-p1-staging-le7u.onrender.com`

Never commit or paste secret values. There is **no entitlement granted by Stripe success_url**.

## Approval state

The founder/Deep approved continuing implementation in `feat/stripe-paywall` but did not authorize merging PR #32, running 0008, deploying or accepting money. Any new code requires final audit and CI. CSLE remains separate and frozen.
