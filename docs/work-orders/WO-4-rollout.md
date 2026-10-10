# WO-4 rollout packet


## 2026-10-10 release continuation

Blake now explicitly requested build and deployment. The earlier no-rollout status below is historical. Migration 0007 was rehearsed and rolled back, then applied to the existing production project after matching its public Supabase identity. All 296 canonical catalog records were imported and read back exactly; 8 are researched graduate/adult routes. The standalone seed connection now disables prepared statements, matching the app's transaction-pooler configuration.

Local production-build integration and desktop/mobile browser checks passed, including actual academic edit/clear persistence and complete cleanup of disposable accounts. Repeat the explicit integration suite on the deployed app with `node tests/release-smoke.mjs --run`; it sends no emails, uses only temporary synthetic accounts, and deletes both public/auth identities. Do not set RELEASE_SMOKE_ORIGIN unless deliberately testing localhost. Current deployment result is tracked in STATE.md.


2026-10-08. Local implementation is on feat/adult-graduate-support, based on 91a58f3. No commit, push, migration, live seed import, deployment, or external communication has been performed. Repo AGENTS.md requires explicit authorization for commits/pushes and prohibits external service calls outside build; this packet is ready for that approval.

## What is ready

- Adult and graduate onboarding, editable vault education history, intended program, online/part-time study and optional return-to-school facts.
- Nullable graduation year and a versioned education_profile JSON document; existing grades and student rows remain intact.
- Deterministic eligible / ineligible / needs-information decisions. Both legacy eligibility vocabularies normalize. Missing, malformed, conflicting and stale facts remain unresolved.
- Separate grant, scholarship, tuition discount, employer assistance, paid placement, and loan-repayment terms. Amount type, application cycle, combining-award restrictions, service obligations, and verification dates survive display and export.
- Six researched adult/MSW records: ACU alumni discount, P.E.O. continuing-education grant, Gosnell, Lyons, Barron, UTA Title IV-E. AAUW corrected to certificate/non-degree scope. No general GCU MSW scholarship has been invented.
- 294 normalized local records. Eleven duplicate occurrences merged and 17 expired cycles marked closed at the 2026-10-08 validation run. Older unverified records keep null verification dates.
- Existing application history is never deleted by match refresh. Profile updates require a returned database row before claiming a successful save.
- New EducationProfile records rank locally and make no AI request. Existing coaching prompts use adult-inclusive language; no new profile payload is attached to AI calls.

## Verification

- npm test: 36 passing offline regression tests.
- npx tsc --noEmit: passing.
- ESLint with --max-warnings 0 over all 34 changed source files: passing.
- git diff --check: passing.
- Independent review: all reported important findings fixed and verified.
- Production build: see WO-4-progress.md for final run. Existing middleware deprecation warning is unrelated. One repeat build encountered a transient Next/Turbopack Google-font resolution failure; no source/config/dependency workaround was introduced.
- Database migration has been inspected but has not been executed against any database. Authenticated browser saving and database integration must be smoke-tested during approved rollout; offline tests are not a claim of live end-to-end verification.

## Authorized release sequence (not executed)

1. Apply migration 0007 to the intended test database, verify columns/check constraints, and repeat against the approved production target before deploying this code. Use the existing runner with the explicit filename; its default list is a historical restore, not a pending-migrations detector:

   `node scripts/run-migrations.mjs supabase/migrations/0007_adult_graduate_support.sql`

2. Run `node scripts/verify-seed.mjs`. It operates locally and refuses invalid batches. Then run `node scripts/seed-scholarships.mjs` against the approved target. The latter writes remotely and must not be run before authorization. It updates existing canonical awards, archives duplicate award rows without deleting history, and never advances source-verification dates on import.
3. Build, commit, push, and deploy the reviewed branch after authorization. Keep database changes ahead of the new application code. No dependencies or auth/billing configuration changed.
4. Smoke-test a new adult account and an existing high-school account: save/clear profile, refresh matches, see eligibility reasons and percent discount, save an award and create an application, edit the profile so that award no longer qualifies, refresh again and verify application survives. Confirm JSON/text exports and vault applications retain funding labels. Confirm age/citizenship details never enter new AI calls.
5. Each learner supplies their own education background, intended field, and schools. GPA, age, need, education gap, memberships, and program dates remain unknown until supplied. Comparing multiple schools keeps school-specific funding conditional. No personal account was created or populated by this work.

## Three weakest points addressed

1. Legacy data restrictions could disappear or be mistaken for confirmed eligibility: canonical normalization, explicit unresolved rules, strict identity checks, numeric-year handling, and regressions.
2. Degree discounts and cash awards could become misleading savings totals: funding-aware labels, removed summed estimates, visible stacking/service/cycle terms in results and exports.
3. A save or match refresh could falsely succeed or destroy application history: returned-row checks and non-deleting match reassessment.

## Six-month failure risk

The largest risk is stale funding terms and application cycles. Verification expires after 90 days; expired cycles close during catalog validation and runtime checks. Imports do not counterfeit freshness. Catalog expansion must preserve exact source dates and unsupported restrictions; provider review is still required to reopen a cycle. Treat degree study mode and local field-placement requirements separately. Keep versioned profile validation and existing-student regressions when extending the schema.
