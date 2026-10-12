# STATE.md — Scholarship Scout

## 2026-10-12 - Researched MSW funding list

The requested 18-opportunity MSW list is implemented on the graduate Social Work funding page and remains visible before enrollment or a match refresh: 10 starting leads, 3 later-stage leads and 5 UTA alternatives. Exact provider links, latest published amounts, next-cycle uncertainty and eligibility conditions remain visible. The list is a planning view; matching gates are unchanged.

Scoped live import: 12 new awards and 6 updated, zero errors, all 18 read back against amounts, terms, source dates, status and eligibility. The requested learner profile was corrected from a second bachelor's target to a social-work master's while retaining the completed bachelor's and other facts. Its matches were refreshed without external AI requests; application IDs, linked matches and statuses were preserved. Personal profile details and rollback snapshots remain outside version control.

Validation: 44 offline tests, TypeScript, changed-file lint, production build and the authenticated local-production release smoke suite pass. An independent read-only review found no issues. Browser verification confirmed all 18 award entries, 18 official-source links, the 10/3/5 grouping, expandable later-stage/UTA sections and a 390px mobile layout without horizontal overflow.

Production: implementation commit 786d4fd2b1ddfcfd6c1a717611813df67a290df8 was pushed to origin/main and deployed. The stable URL https://scholarship-scout-five.vercel.app resolves to deployment dpl_41KNJL7fUPyL91XmQxi13jNJM75m (scholarship-scout-c3f21q5v1-fcom.vercel.app), verified Ready. The authenticated live release suite passed funding-list visibility before matching, graduate matching, preserved applications, graduate exports, legacy profiles and cross-user privacy. All task-created browser/release test accounts were removed and their cleanup verified. The task-created browser tab and local production server were closed.

Learner entry: sign in and open Discover Scholarships. Graduate Social Work profiles now see the Social-work funding list above personalized matches. Requirements and future-cycle uncertainty remain explicit; inclusion is not a promise of eligibility or an award.

## 2026-10-10 - Rollout approval and live re-verification

The user explicitly approved the prepared migration, catalog import, commit/push and deployment rollout. The current workspace already contained the completed production release, so no migration or catalog import was repeated. Fresh checks confirmed the stable production URL is Ready and returns HTTP 200; all seven adult-support columns and both constraints are present; all 296 canonical award records match production amounts, funding, eligibility, status, source and UTC verification dates. The physical catalog retains 298 rows to preserve duplicate history. Remote main matches the recorded release handoff. No accounts, applications, credentials or production data were changed during this approval verification.



## 2026-10-10 - Graduate funding release

The user requested resuming build and deployment for the adult graduate-school funding path. The approved WO-4 implementation is complete, with eight researched adult/graduate funding routes, actionable next steps, searchable funding categories, and a graduate guide available before the first match. Fixed clearable education selectors and added post-onboarding GPA/target-field editing.

Production database: additive migration 0007 applied after a rolled-back rehearsal; constraints and nullable education fields read back. Catalog import completed with 296 updates, zero errors, and exact read-back comparison of all canonical records. Physical table contains 298 rows because history-preserving duplicates are retained. No existing accounts or applications removed.

Validation: 42 offline tests pass; TypeScript and changed-source lint pass. Final production build passes, including the first-visit graduate guide and display corrections. Authenticated production-build smoke tests passed for graduate save/match, conditional eligibility, preserved application history, JSON/text exports, legacy profile compatibility, and cross-user RLS. Real browser category filtering, 390px mobile layout, GPA/target-field edits, and clear/save were verified. All disposable test accounts were removed.

Production release: implementation commit `34bf227495d1b777d2decce659f41f78b9d79a67` pushed to `origin/main` and deployed to Vercel. Stable URL https://scholarship-scout-five.vercel.app resolves to deployment `dpl_9UxiaUVcpgLDRErVYcWt4ihzLMLw` (`scholarship-scout-dh065nrzr-fcom.vercel.app`), verified Ready. The authenticated release suite passed again against the stable live URL, including graduate matching, preserved applications, exports, legacy profiles, and cross-user privacy. Cleanup verified both public and auth identities removed for every temporary release account.

Learner entry: sign in, open My Vault to add or edit education and academic facts, then Discover Scholarships and refresh funding matches. The graduate guide presents tuition discounts, employer support, grants, and paid placements with provider-specific next steps and unresolved eligibility made explicit.


## 2026-10-08 ? Adult and graduate support (WO-4)

Implemented locally on feat/adult-graduate-support: adult/graduate education profiles and onboarding/vault editing; deterministic eligibility with explicit unknowns; six researched adult/MSW funding records; 294 normalized catalog entries; funding-aware results/dashboard/exports; safe application-history reassessment; additive migration 0007. No live rollout or database writes. Thirty-six offline tests, TypeScript and changed-source lint pass; see docs/work-orders/WO-4-progress.md for final build. Independent review findings corrected. New education profiles rank locally after automatic review declined external AI profile sharing. Migration and deployment require the approved release sequence in docs/work-orders/WO-4-rollout.md. No commit/push performed per repo AGENTS.md.


## Current Phase: Phase 5 — LAUNCH PREP (mini-pilot)

**Date:** August 13, 2026 (evening)
**Status:** RESURRECTED — build verified, repo on GitHub, backend needs recreation

### Resurrection pass (2026-08-13, Blake GO with caps: $100/mo infra, weekend + 2 evenings/mo)

- Blake ruling: run as MINI-PILOT — soft launch to family + local circle, improve, scale only on traction. Full autonomy granted on product changes ("make it awesome, it's yours").
- `npm run build` re-verified PASSING untouched after 6 months (zero errors, all 53 routes) — no dependency upgrades needed or performed.
- Git initialized (was never version-controlled); baseline commit `b4aea8c`; pushed to github.com/BLAKE0709/scholarship-scout (pre-existing empty private repo).
- **Supabase project DEAD** — DNS gone (free-tier project deleted after prolonged idle pause). Recreate fresh project + run the 5 migrations + update .env.local. No production data existed; nothing of value lost.
- Launch to-do tracked in session task list: (2) Supabase recreation, (3) scholarship data pipeline + 300-500 verified seed — THE launch-critical gap, (4) Resend email wiring (trial sequence sends nothing today), (5) landing page + privacy/ToS, (6) Vercel + Stripe live + domain + E2E + soft launch.

## Phase 4 status (as of February 7, 2026): PHASE4_COMPLETE_BUILD_PASSES

## Phase 4 Deliverables

### Task 1: Stripe Integration (COMPLETE)

- Stripe server client with lazy initialization (build-safe)
- Product/price sync: Pro ($9.99/mo, $99.99/yr), Family ($14.99/mo, $149.99/yr), District (custom)
- Checkout session creation with 14-day trial for first-time subscribers
- Billing portal session creation
- Webhook handler for 5 event types (checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed, invoice.payment_succeeded)
- Webhook endpoint excluded from auth middleware
- Billing status API (GET current plan + subscription info)
- Files: client.ts, products.ts, checkout.ts, portal.ts, webhooks.ts, 4 API routes (webhooks/stripe, billing/checkout, billing/portal, billing/status)

### Task 2: Plan Enforcement & Feature Gating (COMPLETE)

- PLANS constant with 4 plan configs (Free, Pro, Family, District) and 15 feature flags
- Server-side feature gating: checkFeatureAccess, checkUsageLimit, getUserPlan
- Client-side usePlan hook (React Query, 5-min stale time)
- UpgradeGate component (inline + overlay variants with blur)
- UsageMeter component (green/amber/red progress bars)
- FidelityDisplay: gated (Pro shows breakdown, Free shows '??')
- APSDisplay: gated (Pro shows radar chart, Free shows level only)
- Pricing page with 3 plan cards, monthly/yearly toggle, feature comparison table
- Files: plans.ts, gate.ts, use-plan.ts, upgrade-gate.tsx, usage-meter.tsx, fidelity-display.tsx, aps-display.tsx, pricing/page.tsx

### Task 3: Billing UI & Subscription Management (COMPLETE)

- Billing settings page with 5 sections (plan, usage, payment, invoices, cancel)
- Invoice listing API (fetches from Stripe)
- Cancel subscription API (cancel_at_period_end)
- Resubscribe API (undo cancellation)
- PlanBadge component (color-coded by plan)
- CancellationDialog with feature loss list
- Plan badge added to sidebar footer with trial countdown
- Billing nav item added for student and parent roles
- Post-checkout success page with confetti
- Onboarding step-complete updated with trial offer
- Files: billing/page.tsx, invoices route, cancel route, resubscribe route, plan-badge.tsx, cancellation-dialog.tsx, signup/success/page.tsx, updated app-shell.tsx + step-complete.tsx

### Task 4: Free Trial & Conversion (COMPLETE)

- Trial management: startTrial, checkTrialStatus, handleTrialExpiry
- Trial expiry cron endpoint
- Trial banner with countdown (dismissible, amber when <=3 days)
- Trial email sequence (5 touchpoints: day 1, 7, 12, 14, 17)
- Upgrade nudge component (4 types: match_limit, essay_limit, fidelity_tease, vault_export)
- Conversion tracking (9 event types in analytics_events)
- Conversion tracking API endpoint
- Files: trial.ts, cron/trials route, trial-banner.tsx, trial-sequences.ts, upgrade-nudge.tsx, conversion.ts, analytics/conversion route

## Phase 3 Deliverables (COMPLETE)

- Student Dashboard (5 stat cards, matches, deadlines, vault health, activity)
- Application Tracking (Kanban pipeline, DnD, detail pages, document upload)
- Parent Dashboard (family linking, privacy boundaries, notification prefs)
- Counselor Dashboard (aggregate stats, student table, at-risk, nudges)
- Notification Engine & Vault (bell, scheduler, 6-tab vault, achievements, export)

## Database Schema

- 25 tables (unchanged from Phase 3)
- Existing plans + subscriptions tables used for Phase 4
- 4 SQL migrations total

## Route Inventory (53 routes)

- 20 pages (+3: pricing, settings/billing, signup/success)
- 33 API routes (+9: webhooks/stripe, billing/checkout, billing/portal, billing/status, billing/invoices, billing/cancel, billing/resubscribe, billing/trial-status, cron/trials, analytics/conversion)
- Middleware for auth (Stripe webhook excluded)

## Build Status

- `npm run build`: PASSES (zero errors, zero warnings)
- TypeScript: strict mode, all types resolved
- All 53 routes compile and generate successfully
- Stripe client uses lazy initialization to avoid build-time env var errors

## What's Next

- Phase 5: Launch preparation
