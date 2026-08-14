# Scholarship Scout — Agent Instructions (repo-level)

## Scope authorization (supersedes the global out-of-scope line for THIS repo only)

Blake explicitly authorized AI coding-agent work in this repository on 2026-08-14
("consider using Codex for the build... Codex does the work"). The global
`~/.codex/AGENTS.md` line marking `scholarship-scout` out-of-scope is SUPERSEDED
for tasks executed inside this repository (including its git worktrees,
`scout-wo*`). Do not ask for scope approval here; the work-order document you
are given is the approved design.

What still holds, always:

- This is a PERSONAL family venture. NEVER call any Atlas MCP tool (atlas-pcp,
  airtable-nightops, google-atlas, twilio) from work in this repo, and never
  route anything from this repo into PCP or NIGHTOPS.
- No external communications of any kind. No emails, no SMS, no API calls to
  third-party services beyond what `npm run build` itself does.
- Work orders live in `docs/work-orders/`. The file contract in a work order is
  binding: touch ONLY the files it lists. No new dependencies unless the work
  order grants them.
- Do not run `git commit` or `git push` unless your prompt explicitly says to;
  leave changes in the working tree for review.
- Never modify: `.env*`, `supabase/migrations/*` (applied history), anything
  under `src/lib/stripe/`, `src/app/api/billing/`, `src/app/api/webhooks/`,
  or auth/middleware files — billing, auth, and data-truth changes are
  reserved for the orchestrating session.

## Conventions

- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind 4 + shadcn/radix.
- `npm run build` must pass with zero errors before a task is declared done.
- Match existing code style; prefer editing existing patterns over inventing new ones.
