# WO-2: Privacy Policy + Terms of Service pages

## Role

Scoped work order inside an existing Next.js 16 App Router + Tailwind 4 app (Scholarship Scout). Bricklayer role: implement exactly this, nothing else.

## File contract (create/modify ONLY these)

- `src/app/(marketing)/privacy/page.tsx`
- `src/app/(marketing)/terms/page.tsx`
- `src/components/marketing/legal-layout.tsx` (shared prose wrapper: max-width, headings hierarchy, last-updated stamp, table of contents from section headings)

Read-only reference: the rest of src/ for styling conventions. Do NOT touch routing, middleware, auth, or any other file. No new dependencies.

## Content requirements

Write real, specific policies for THIS product (plain-English, section-numbered). Facts about the product you must reflect accurately:

- Operator: Scholarship Scout ("we"), a family-operated service based in Texas. Contact: support email placeholder `support@` + the product domain (single constant at top of each file so the domain can be swapped at deploy).
- Audience/age: users must be 13 or older; users under 18 need parent/guardian consent; parent accounts exist and are linked to student accounts with student consent.
- Data collected: account info (name, email, role), student academic profile (GPA band, graduation year, interests, achievements), essays and documents the user uploads, application tracking data, usage analytics (first-party event table), billing via Stripe (we never store card numbers), AI interactions (essay coaching requests are processed by a third-party AI provider - Anthropic).
- Privacy boundaries that are PRODUCT FACTS: parents/counselors can see progress and deadlines but never essay content, essay revision history, or AI chat transcripts. State this explicitly in the privacy policy - it is a differentiator.
- Data use: matching, deadline alerts, product improvement. NO selling of personal data, NO advertising use, NO training AI models on user essays.
- Third parties: Supabase (hosting/database), Stripe (payments), Anthropic (AI), email provider (transactional email), Vercel (hosting). Name them.
- User rights: export (vault export exists in-product), deletion on request, correction; FERPA-adjacent posture: we are a consumer product, not a school official.
- Terms: 14-day free trial, no card required; subscriptions auto-renew, cancel anytime effective end of period (matches in-product cancel_at_period_end behavior); refund posture: pro-rated refunds not offered but cancellation stops future charges; acceptable use (no plagiarism submission - the essay coach maintains authorship, users are responsible for what they submit); scholarship listings are informational, deadlines/awards controlled by providers, we verify sources but do not guarantee outcomes; liability limited to fees paid in last 12 months; Texas governing law; changes notified by email 14 days ahead.

## Quality bar

- Plain English, short sections, real content — zero [PLACEHOLDER] blocks other than the single domain constant.
- This is NOT legal advice boilerplate soup: every clause must be consistent with the product facts above. Where you are unsure of a product fact, write the conservative version and flag it in the result file.
- `npm run build` passes clean.

## Done means

Both pages render, build passes, nothing outside contract touched, and `docs/work-orders/WO-2-RESULT.md` lists any clauses flagged for human/lawyer review.
