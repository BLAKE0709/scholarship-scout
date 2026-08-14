-- 0005: RLS baseline for launch.
-- Philosophy: service-role API routes bypass RLS and are unaffected. These
-- policies govern what the browser client (anon key + user JWT) can reach.
-- Essays, revisions, documents, and AI interactions are OWNER-ONLY — the
-- parent privacy wall is product law and is enforced here, not just in APIs.

-- ── Helper functions (SECURITY DEFINER = run as owner, bypassing RLS inside;
--    search_path pinned per the 0002 lesson) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_my_student_profile(sp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.id = sp_id AND sp.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_linked_parent_of(sp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    JOIN public.family_links fl ON fl.student_id = sp.user_id
    WHERE sp.id = sp_id
      AND fl.parent_id = auth.uid()
      AND fl.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.owns_essay(e_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.essays e
    JOIN public.student_profiles sp ON sp.id = e.student_id
    WHERE e.id = e_id AND sp.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ── users ──────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
-- Linked parents/students/counselors may read each other's basic user row
DROP POLICY IF EXISTS "users_select_linked" ON users;
CREATE POLICY "users_select_linked" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM family_links fl
    WHERE fl.status = 'active'
      AND ((fl.parent_id = auth.uid() AND fl.student_id = users.id)
        OR (fl.student_id = auth.uid() AND fl.parent_id = users.id))
  )
  OR EXISTS (
    SELECT 1 FROM counselor_students cs
    WHERE (cs.counselor_id = auth.uid() AND cs.student_id = users.id)
       OR (cs.student_id = auth.uid() AND cs.counselor_id = users.id)
  )
);

-- ── profiles ───────────────────────────────────────────────────────────────
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_all_own" ON student_profiles;
CREATE POLICY "sp_all_own" ON student_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "sp_select_parent" ON student_profiles;
CREATE POLICY "sp_select_parent" ON student_profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM family_links fl
    WHERE fl.student_id = student_profiles.user_id
      AND fl.parent_id = auth.uid() AND fl.status = 'active'
  )
);

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pp_all_own" ON parent_profiles;
CREATE POLICY "pp_all_own" ON parent_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE counselor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_all_own" ON counselor_profiles;
CREATE POLICY "cp_all_own" ON counselor_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── catalog: readable by any signed-in user ────────────────────────────────
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scholarships_read" ON scholarships;
CREATE POLICY "scholarships_read" ON scholarships FOR SELECT
  TO authenticated USING (true);

ALTER TABLE scholarship_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "providers_read" ON scholarship_providers;
CREATE POLICY "providers_read" ON scholarship_providers FOR SELECT
  TO authenticated USING (true);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_read" ON plans;
CREATE POLICY "plans_read" ON plans FOR SELECT TO authenticated USING (true);

-- ── student-owned working data ─────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_all_own" ON matches;
CREATE POLICY "matches_all_own" ON matches FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));
DROP POLICY IF EXISTS "matches_select_parent" ON matches;
CREATE POLICY "matches_select_parent" ON matches FOR SELECT
  USING (is_linked_parent_of(student_id));

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applications_all_own" ON applications;
CREATE POLICY "applications_all_own" ON applications FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));
DROP POLICY IF EXISTS "applications_select_parent" ON applications;
CREATE POLICY "applications_select_parent" ON applications FOR SELECT
  USING (is_linked_parent_of(student_id));

-- Privacy wall: OWNER ONLY. No parent, no counselor, no exceptions.
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "essays_all_own" ON essays;
CREATE POLICY "essays_all_own" ON essays FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE essay_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revisions_all_own" ON essay_revisions;
CREATE POLICY "revisions_all_own" ON essay_revisions FOR ALL
  USING (owns_essay(essay_id)) WITH CHECK (owns_essay(essay_id));

-- NOTE: live ai_interactions is keyed by student_id (0001 hand-written schema),
-- not user_id as drizzle's schema.ts suggests.
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_all_own" ON ai_interactions;
CREATE POLICY "ai_all_own" ON ai_interactions FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_all_own" ON documents;
CREATE POLICY "documents_all_own" ON documents FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_all_own" ON achievements;
CREATE POLICY "achievements_all_own" ON achievements FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE aps_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aps_all_own" ON aps_scores;
CREATE POLICY "aps_all_own" ON aps_scores FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE fidelity_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fidelity_all_own" ON fidelity_scores;
CREATE POLICY "fidelity_all_own" ON fidelity_scores FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

ALTER TABLE fidelity_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "baselines_all_own" ON fidelity_baselines;
CREATE POLICY "baselines_all_own" ON fidelity_baselines FOR ALL
  USING (is_my_student_profile(student_id))
  WITH CHECK (is_my_student_profile(student_id));

-- ── subscriptions: read own; writes are Stripe-webhook (service role) only ─
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subs_select_own" ON subscriptions;
CREATE POLICY "subs_select_own" ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- ── deny-by-default tables (service role only; no client policies) ─────────
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_profiles ENABLE ROW LEVEL SECURITY;

-- ── fix pre-existing holes ─────────────────────────────────────────────────
-- Any authenticated user could enumerate link codes and attach themselves as
-- a "parent" to any student. Validation goes through service-role APIs.
DROP POLICY IF EXISTS "Anyone can read link codes for validation" ON link_codes;

-- Any authenticated user could insert notifications for anyone (spam/phish
-- vector). The scheduler inserts via service role, which bypasses RLS anyway.
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
