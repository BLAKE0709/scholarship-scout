# DECISIONS.md — Scholarship Scout

### 2026-02-07 - Client-Side Dashboard Data Fetching

**Choice:** Dashboard page remains "use client" with useEffect data fetching rather than converting to Server Component
**Alternatives considered:** Server component with server-side data fetching, React Server Actions
**Rationale:** The existing AppShell layout uses client-side auth (useUser hook), and the dashboard needs role-based rendering that depends on client state. Converting to RSC would require restructuring the auth flow. Client-side fetching with loading skeletons provides good UX.
**Trade-offs:** Initial data fetch on client adds slight delay vs server-rendered. Mitigated by skeleton loading states.

### 2026-02-07 - HTML5 Drag and Drop for Pipeline

**Choice:** Native HTML5 DnD API instead of external libraries (dnd-kit, react-beautiful-dnd)
**Alternatives considered:** @dnd-kit/core, react-beautiful-dnd, react-dnd
**Rationale:** Per spec requirements ("no heavy library"), HTML5 DnD is sufficient for column-to-column card moves. Keeps bundle size minimal.
**Trade-offs:** Less polished animations than dedicated DnD libraries. Mobile drag support is limited (works with touch events on most modern browsers). Acceptable for MVP.

### 2026-02-07 - Drizzle ORM for API Routes, Supabase Client for Dashboard

**Choice:** API routes use Drizzle ORM for database queries; dashboard components use Supabase client for direct queries
**Alternatives considered:** Drizzle everywhere, Supabase everywhere
**Rationale:** API routes benefit from Drizzle's type-safe query builder and relationship handling. Dashboard client components need Supabase's browser client for real-time capabilities and auth-aware queries. This matches the existing Phase 2 pattern.
**Trade-offs:** Two query patterns to maintain. Acceptable since they serve different layers.

### 2026-02-07 - Text Export Instead of PDF for Vault

**Choice:** Vault export offers JSON and formatted text instead of PDF
**Alternatives considered:** jsPDF, html-pdf, puppeteer-based PDF generation
**Rationale:** PDF generation libraries add significant bundle weight or require server-side rendering. Text export provides a professional, structured document that can be opened anywhere. JSON export enables data portability.
**Trade-offs:** Text isn't as visually polished as PDF. Can add PDF generation in Phase 4 with a lightweight library if needed.

### 2026-02-07 - Notification Polling vs WebSocket

**Choice:** 30-second polling interval for notification bell
**Alternatives considered:** Supabase real-time subscriptions, WebSocket, Server-Sent Events
**Rationale:** Polling is simplest to implement and debug. Notification latency of 30 seconds is acceptable for scholarship deadlines and status updates. Supabase real-time could be added later as an optimization.
**Trade-offs:** Slightly higher server load from polling. 30-second notification delay. Both acceptable for current scale.

### 2026-02-07 - Essay Revision Strategy (Threshold-Based)

**Choice:** Create revisions only when content changes by >20 characters or >5 words, not on every auto-save
**Alternatives considered:** Revision on every save, time-based (every 5 minutes), manual revision creation
**Rationale:** Auto-save fires every 3 seconds. Creating a revision on every save would generate ~600 revisions for a 30-minute writing session, bloating the DB and making the timeline useless. Threshold-based detection ensures only meaningful changes get tracked.
**Trade-offs:** Very small edits (typo fixes) won't create their own revision. Acceptable since the content is always saved to the essay record regardless.

### 2026-02-07 - Essay Hard Delete with Cascade

**Choice:** Hard delete essays (with revision cleanup) rather than soft delete
**Alternatives considered:** Soft delete with status="deleted", soft delete with deleted_at timestamp
**Rationale:** The essay status column is a Postgres enum (draft/in_progress/review/final) — adding "deleted" requires a schema migration. Revision history provides an audit trail. Hard delete with cascade (revisions first) is clean and matches the existing enum constraint.
**Trade-offs:** No undo for deleted essays. Acceptable for student-owned content where accidental deletes are rare.

### 2026-02-07 - AI Chat Ref Pattern for Stable Callbacks

**Choice:** Use refs for messages and context in useAIChat to keep sendMessage callback stable
**Alternatives considered:** Including messages/context in useCallback deps (default), useMemo for context object
**Rationale:** sendMessage was being recreated on every message (messages in deps) and every render (context object identity changes). This caused unnecessary re-renders of the AISidebar. Refs let us read current values without adding deps.
**Trade-offs:** Refs bypass React's reactivity model. Acceptable here since sendMessage only needs current values at call time, not for rendering.

### 2026-02-07 - Privacy Boundary Architecture

**Choice:** API-level enforcement of privacy boundaries for parent and counselor views
**Alternatives considered:** Frontend-only filtering, RLS-only, middleware-based access control
**Rationale:** Privacy is non-negotiable. The API endpoints for /api/family/students/[studentId] and /api/counselor/students explicitly exclude essay content, revision history, and AI interaction data. This provides defense-in-depth alongside RLS policies.
**Trade-offs:** More API routes to maintain. Worth it for data protection guarantees.

### 2026-02-07 - Lazy Stripe Client Initialization

**Choice:** Stripe client uses lazy initialization via getter function + Proxy, not module-level instantiation
**Alternatives considered:** Direct module-level `new Stripe()`, environment check with fallback
**Rationale:** Next.js evaluates server modules at build time for static analysis. A module-level throw on missing STRIPE_SECRET_KEY kills the build in CI/CD where Stripe keys aren't needed. Lazy init defers the throw to first actual API call.
**Trade-offs:** Slightly more complex client.ts. Worth it for build reliability.

### 2026-02-07 - Feature Gating Architecture (Server + Client)

**Choice:** Dual-layer gating: server-side `checkFeatureAccess()` for API enforcement + client-side `usePlan()` hook for UI rendering
**Alternatives considered:** Server-only (RSC), client-only, middleware-based
**Rationale:** Server-side gates ensure free users can't bypass limits via direct API calls. Client-side gates provide instant UI feedback (blurred content, upgrade prompts) without round-trips. Both read from the same subscription data.
**Trade-offs:** Two code paths to maintain. Acceptable since they serve different purposes (security vs UX).

### 2026-02-07 - Trial Without Payment Method

**Choice:** 14-day trial starts without requiring credit card upfront
**Alternatives considered:** Require CC at trial start (Stripe default), 7-day trial, no trial
**Rationale:** Lower friction for conversion. Students are price-sensitive — forcing CC upfront reduces trial starts. The trial expiry cron handles cleanup. Stripe checkout with trial_period_days handles the CC-at-checkout flow for users who want to convert.
**Trade-offs:** Higher trial churn (users who never convert). Mitigated by trial email sequence (5 touchpoints) and contextual upgrade nudges.

### 2026-02-07 - Conversion Tracking via Analytics Events Table

**Choice:** Conversion funnel events stored in existing `analytics_events` table with `conversion:` prefix
**Alternatives considered:** Separate conversion_events table, external analytics (Mixpanel, Amplitude), Stripe-only tracking
**Rationale:** Reuses existing table and avoids new migrations. The `conversion:` prefix makes filtering easy. Can export to external analytics later if needed.
**Trade-offs:** No real-time funnel visualization yet. Acceptable for MVP — raw data is there for future dashboards.
