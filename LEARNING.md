# Scholarship Scout learning log

## 2026-10-08 ? Adult funding implementation

- Never treat absent GPA, class year, need, citizenship, or provider evidence as proof of eligibility. Retain unknown restrictions rather than silently dropping unfamiliar data types or prose.
- Graduate study and previous degrees are separate facts; an adult can return to undergraduate education. No SAT/ACT completeness penalty for adult paths.
- Supabase updates without a selected row can silently affect zero records under RLS. Require a returned row before reporting a saved profile or onboarding completion.
- An application can reference a match still marked new. Refresh must retain its row and reassess eligibility; workflow status is not a safe deletion signal.
- PostgreSQL CHECK permits NULL. Versioned JSON constraints need explicit COALESCE or equivalent non-null truth conditions.
- Scholarship import time is not verification time. Preserve evidence timestamps, cycle status, actual restrictions, percentage amounts and school-specific terms.
- tsx ESM namespaced imports failed on this Windows/Node 25 installation. Its supported CJS API loads shared TypeScript normalization in existing .mjs scripts without another dependency.
- New adult-profile AI egress was rejected by automatic approval review. Keep new EducationProfile ranking local; no indirect profile/assessment payload sharing.
- Next/Turbopack's Google-font resolver failed on one repeat build despite a prior successful build. Retry confirmed the issue was intermittent; no font/config source edits were made. Final outcome is recorded in WO-4-progress.md.

## 2026-10-10 - Release import failure

The first live catalog import partially succeeded (7 added, 286 updated, 3 errors) because the standalone importer enabled prepared statements on the Supabase transaction pooler. PostgreSQL reported prepared statements missing after pooled connections changed. Match src/lib/db/index.ts with prepare:false, then rerun the idempotent import and compare every validated record to the stored catalog. No application or account rows were deleted.

Release smoke cleanup must delete the exact synthetic public.users identity as well as the Supabase auth user: public.users has no auth.users foreign key. The initial cleanup assertion caught one leftover temporary public account, which was removed explicitly. Always preserve the original test failure alongside cleanup diagnostics.

## 2026-10-10 - Graduate release verification

- Keep optional Radix Selects controlled with an empty string; undefined after clearing can leave a stale visible selection.
- Eligibility notices must lead to an editor for missing academic facts. Hydrate GPA, scale, and target field; save through the academic stage while preserving other profile data.
- The app shell waits for browser authentication hydration. Raw HTML can verify server payloads, but interactive card text and filters require a real browser.
- Existing timestamp columns store UTC without a timezone. Compare source-verification timestamps with an explicit UTC interpretation, rather than the Windows client's local-zone parser.
- PowerShell's native-process text pipe can replace non-ASCII characters. Use ASCII transport/escaped Unicode or explicit UTF-8 for source edits; verify rendered separators.
- Three weak points closed: stale selector state, missing post-onboarding academic editing, and the catalog importer's transaction-pooler incompatibility.
- Six-month risk remains outdated program terms/cycles. Keep verification dates and the 90-day freshness gate; do not promise a provider award or combine discount percentages into savings. Imports remain idempotent and retain application history.

The remote repository is PUBLIC, contrary to an old local private-repository note. Verify current repository visibility before publishing; release docs and fixtures contain no named learner profile. Production profile data and credentials remain outside version control.

Run the whitespace gate on the staged diff as well: unstaged git diff does not include new files. This release gate caught and removed two extra EOF blank lines.
