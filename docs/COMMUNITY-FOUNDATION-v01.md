# Community & Partners foundation — delivery and staging gates

## Built in this draft
- The **public discovery layer** from PR #76: six categories, public routes and partner introduction. No fabricated organizations or activity.
- An authenticated **/comunidade** React page. Only trusted server-issued grants allow the posting actions; absent features show a proper unavailable state.
- Community database schema **draft 0009**, pending SQL review, with explicit Club/Academy grants, groups, moderators, topics, replies, verified organizations and voluntary inquiries.
- Forum tRPC endpoints: published public groups/topics, verified organizations, authorized private groups, topic/reply submission pending moderation, and privileged publish/hide actions.
- Access policy: visitor can browse public material; Academy grants read/reply only in permitted groups, not opening topics; Club grants broader rights; group moderation requires a valid Club grant plus server-side moderator assignment; server admins can moderate.
- No web API for granting access; no checkout, coupon, paid ads, referral commission or lifetime assignment implemented. Commercial amounts intentionally remain undecided.

## Safety commitments
- `LINGUA_PORTAL_COMMUNITY_ENABLED` **off by default**. No production writes without approved migration and feature rollout.
- Never derive membership from login, Stripe checkout initiation, or a posted promotion code. Membership must be traceable to an authorized, verified payment/award.
- User posts and replies begin **pending** and are not returned in public listings until an authorized moderator publishes them.
- A company appearing in the public directory must have `verificationState=verified`, which means administrative listing approval only, **not** validation of legal licensing. That must be handled separately.
- No list of students, learner memories or private chat transcripts is shared with institutional accounts; leads require distinct, explicit member initiation and lawful notices.
- Text-first interface avoids image uploads until abuse prevention, quotas, safe transcoding and CDN are reviewed. No custom compression algorithm is necessary.
- Private group access must always be checked by the server. Never rely on the React `canCreate` boolean as authorization.
- Manual database operations may create/alter grants for QA **only with synthetic accounts** in isolated staging, never actual student IDs.

## Staging QA and launch checklist
1. Confirm staging identity and isolated credentials, backup, database drift; apply **0008** only after its independent approval, then review **0009**, manually in staging.
2. Run P0, isolated Chromium, dedicated MySQL QA and anti-leak tests: private Group A vs Group B, revoked membership, pending messages, hidden groups, ownership, invalid group/topic IDs, rate limiting, CSRF and moderation rights.
3. Provide moderator management, abuse reports/appeals, ability to remove posts, data retention, spam defense and community rules before opening registration.
4. Decide Club access duration, Academy scope, loyalty grants, reversals, invoicing and refund policy *before* any entitlement issuer is built.
5. Build verified partner staff accounts, group ownership, regulated-professional credential checks and consented private contact requests before launching sales of institutional pages.
6. Keep the CSLE independent and never treat social popularity as language proficiency or educational evidence.
7. Complete visual-kit asset integration through an authorized binary upload mechanism. This code uses initial typography/structure but is not pixel-perfect reproduction.
8. Approval of privacy notices, public-facing policy and independent QA required before releasing to students.

## Deferred explicitly
Media uploads, AdSense, paid institutional placements, partner referrals/coupons, partner booking rooms, direct messaging, payments, browser push, ranking systems, permanent-membership loyalty issuance, employer job boards and CSLE licensing.

No DB migrations were applied, no production app was deployed and no fees were set by these PRs.
