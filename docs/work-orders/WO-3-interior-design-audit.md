# WO-3: Interior design audit (READ-ONLY report)

You are a senior product designer auditing the logged-in experience of Scholarship
Scout. Your filesystem is read-only BY DESIGN. Your deliverable is a REPORT emitted
to stdout — concrete, file-and-line specific, prioritized. No file writes.

## Context

The new public marketing surface (src/app/(marketing)/) established the design
language: Fraunces display type, deep spruce ink (#14312e), pine (#1a9988), brass
(#a97f24) used sparingly for verification/award moments, paper (#fbfaf6) and mist
(#eaf2ef) surfaces, generous whitespace, honest plain-English copy. The interior
app (src/app/(dashboard)/, (onboarding)/, (auth)/ plus src/components/) was built
in February before this language existed.

## Audit these surfaces, in priority order

1. src/components/layout/app-shell.tsx (or wherever the shell/nav lives — find it)
2. src/app/(dashboard)/dashboard/page.tsx and its stat cards
3. src/app/(dashboard)/scholarships/page.tsx + [id] detail (the money surface)
4. src/app/(onboarding)/onboarding/page.tsx (first impression after signup)
5. src/app/(auth)/login + signup pages (the doorway from the new landing page)
6. src/app/(dashboard)/essays/[id] editor chrome (not the editor logic)
7. Empty states everywhere (new user sees these FIRST — matches empty, essays
   empty, vault empty, notifications empty)

## For each finding, report

- FILE:LINE — what's there now (quote the actual code/classname)
- WHY it undercuts the design language or first-run experience
- FIX — the exact replacement (classnames, copy, or JSX snippet, complete enough
  to apply directly)
- PRIORITY: P1 (new user sees it in first 5 minutes) / P2 (weekly surface) / P3

## Rules

- Visual + copy only. NEVER propose logic, data-flow, or dependency changes.
- Empty-state copy matters most: a brand-new student sees empty dashboards before
  anything else. Every empty state should invite the next action in plain English
  (the marketing page's voice), never apologize.
- The auth pages are the seam between the new landing and the old interior — flag
  every visual discontinuity a user would feel crossing that seam.
- Cap the report at your 25 highest-value findings, ranked. Depth beats breadth.
- End with a one-paragraph verdict: what single change moves the interior closest
  to the marketing surface's quality bar.
