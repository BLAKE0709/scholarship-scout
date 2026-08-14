# WO-1: Public landing page

## Role

You are implementing a scoped work order inside an EXISTING, working Next.js 16 App Router + React 19 + Tailwind CSS 4 + shadcn/radix app called Scholarship Scout. You are the bricklayer; the architecture is decided. Do not refactor, upgrade, or reorganize anything outside your file contract.

## Product context

Scholarship Scout matches students to verified scholarships, tracks applications in a Kanban pipeline, and coaches essays with AI while keeping the student's authentic voice (fidelity scoring). Pricing: Free / Pro $9.99mo ($99.99yr) / Family $14.99mo ($149.99yr), 14-day free trial, no card required. Audience: parents and students, mobile-heavy. Tone: confident, warm, zero hype-speak. This is a family-run product from Colleyville, TX — sincerity is the brand.

## File contract (you may create/modify ONLY these)

- `src/app/(marketing)/layout.tsx` — new marketing layout: minimal header (logo wordmark "Scholarship Scout", links: How it works, Pricing, Log in, CTA button "Start free"), footer (privacy, terms, contact mailto, copyright)
- `src/app/(marketing)/home/page.tsx` — the landing page itself
- `src/components/marketing/*` — any presentational components you need
- You may READ anything in src/ to match conventions (button styles, tailwind tokens, existing pricing page copy) but MUST NOT modify anything outside the contract.

Do NOT touch: `src/app/page.tsx` or root routing/middleware (integration is the reviewer's job), auth, billing, API routes, package.json (no new dependencies — use what's installed: tailwind, radix, lucide-react, recharts if needed).

## Page spec (sections in order)

1. Hero: headline about finding scholarship money without losing your kid's voice; subhead naming the three jobs (find verified matches, track every deadline, write essays that stay yours); primary CTA "Start free" -> /signup, secondary "See how it works" anchor; simple product visual built with CSS/components (a stylized match-card stack), NOT an image file.
2. Trust strip: three stats-style claims that are TRUE of the product (e.g. "Every scholarship verified with a source link", "Deadline alerts before it's too late", "AI that coaches, never ghostwrites"). Do not invent user counts or dollar totals.
3. How it works: 3 steps (Build your profile -> Get matched -> Apply with confidence), each with icon (lucide) + 2 sentences.
4. Feature grid: matching engine, application pipeline, essay coach with fidelity score, document vault, parent view, deadline alerts. 6 cards.
5. For parents band: short reassurance section — privacy boundaries (parents see progress, never essay drafts), one paragraph + 3 checkmarks.
6. Pricing: reuse the plan structure/copy conventions from `src/app/(dashboard)/pricing/page.tsx` as reference, static cards (Free/Pro/Family), yearly-monthly toggle optional; CTAs -> /signup.
7. FAQ: 6 questions (is it free, how are scholarships verified, does AI write the essay [NO — explain fidelity], can parents see essays [no, privacy], cancel anytime, who builds this [family-built in Texas]).
8. Final CTA band.

## Quality bar

- Distinctive, intentional design: pick a confident accent (deep green or indigo family), generous whitespace, real typographic hierarchy. It must NOT look like a default shadcn template or an AI-generated gradient soup. No stock-photo placeholders, no lorem ipsum, no fake testimonials, no fabricated numbers.
- Fully responsive (mobile-first), dark-mode aware via existing `next-themes` setup.
- Accessible: semantic landmarks, alt text, focus states, WCAG AA contrast.
- `npm run build` must pass with zero errors/warnings before you declare done.

## Done means

Build passes, page renders at /home, every section present, no file outside the contract touched, and a 5-line summary in `docs/work-orders/WO-1-RESULT.md` (what you built, any judgment calls).
