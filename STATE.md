# STATE.md — Scholarship Scout

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
