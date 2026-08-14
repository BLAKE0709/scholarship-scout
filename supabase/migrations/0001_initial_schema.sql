-- Scholarship Scout: Initial Schema Migration
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum Types ───────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'student', 'parent', 'counselor', 'institution_admin', 'provider', 'superadmin'
);

CREATE TYPE grade_level AS ENUM (
  'freshman', 'sophomore', 'junior', 'senior',
  'college_freshman', 'college_sophomore', 'college_junior', 'college_senior'
);

CREATE TYPE financial_need AS ENUM ('low', 'medium', 'high');

CREATE TYPE institution_type AS ENUM ('school', 'district');

CREATE TYPE scholarship_status AS ENUM ('active', 'closed', 'upcoming', 'archived');

CREATE TYPE provider_type AS ENUM (
  'foundation', 'corporate', 'community', 'government', 'university', 'other'
);

CREATE TYPE match_status AS ENUM ('new', 'viewed', 'saved', 'applied', 'dismissed');

CREATE TYPE application_status AS ENUM (
  'draft', 'in_progress', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'
);

CREATE TYPE essay_status AS ENUM ('draft', 'in_progress', 'review', 'final');

CREATE TYPE achievement_type AS ENUM (
  'academic', 'athletic', 'community_service', 'leadership', 'arts',
  'work_experience', 'award', 'certification', 'other'
);

CREATE TYPE document_type AS ENUM (
  'transcript', 'recommendation_letter', 'certificate', 'financial_aid', 'other'
);

CREATE TYPE interaction_type AS ENUM (
  'suggestion', 'question', 'feedback', 'generation', 'revision', 'other'
);

CREATE TYPE subscription_status AS ENUM (
  'active', 'trialing', 'past_due', 'canceled', 'paused'
);

CREATE TYPE plan_user_type AS ENUM ('student', 'parent', 'institution');

-- ── Tables ───────────────────────────────────────────────────────────────────

-- 20. plans (first, because institutions FK to it)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  user_type plan_user_type NOT NULL,
  features JSONB DEFAULT '{}',
  match_limit_monthly INTEGER,
  essay_limit_monthly INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 1. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'student',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 6. institutions
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type institution_type NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  student_count INTEGER DEFAULT 0,
  plan_id UUID REFERENCES plans(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. student_profiles
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gpa DECIMAL,
  gpa_scale DECIMAL DEFAULT 4.0,
  sat_score INTEGER,
  act_score INTEGER,
  graduation_year INTEGER NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  school_name TEXT,
  school_id UUID REFERENCES institutions(id),
  grade_level grade_level,
  intended_major TEXT,
  interests TEXT[] DEFAULT '{}',
  extracurriculars TEXT[] DEFAULT '{}',
  ethnicity TEXT,
  gender TEXT,
  first_generation BOOLEAN,
  financial_need financial_need,
  vault_health_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. parent_profiles
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_students UUID[] DEFAULT '{}',
  notification_prefs JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 4. counselor_profiles
CREATE TABLE counselor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES institutions(id),
  district_id UUID REFERENCES institutions(id),
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 5. institution_profiles
CREATE TABLE institution_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 8. scholarship_providers
CREATE TABLE scholarship_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type provider_type NOT NULL,
  description TEXT,
  website TEXT,
  contact_email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 7. scholarships
CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_id UUID REFERENCES scholarship_providers(id),
  description TEXT,
  amount_min INTEGER NOT NULL,
  amount_max INTEGER,
  deadline TIMESTAMP,
  requirements JSONB DEFAULT '{}',
  eligibility JSONB DEFAULT '{}',
  application_url TEXT,
  status scholarship_status DEFAULT 'active',
  renewable BOOLEAN DEFAULT false,
  national BOOLEAN DEFAULT true,
  states TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 9. matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  affinity_score INTEGER,
  win_probability INTEGER,
  match_reasons TEXT[] DEFAULT '{}',
  status match_status DEFAULT 'new',
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_id, scholarship_id)
);

-- 10. applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  status application_status DEFAULT 'draft',
  submitted_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 11. essays
CREATE TABLE essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  prompt TEXT,
  word_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  fidelity_score INTEGER,
  aps_score INTEGER,
  status essay_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 12. essay_revisions
CREATE TABLE essay_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  ai_suggestions JSONB DEFAULT '[]',
  human_edits JSONB DEFAULT '[]',
  word_count INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- 13. achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  type achievement_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  date_start DATE,
  date_end DATE,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 14. documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 15. fidelity_scores
CREATE TABLE fidelity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  stylistic_consistency INTEGER NOT NULL,
  process_authenticity INTEGER NOT NULL,
  ai_integration_quality INTEGER NOT NULL,
  vocabulary_alignment INTEGER NOT NULL,
  conceptual_originality INTEGER NOT NULL,
  behavioral_signals JSONB DEFAULT '{}',
  model_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- 16. fidelity_baselines
CREATE TABLE fidelity_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID UNIQUE NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  writing_style_vector JSONB DEFAULT '{}',
  vocabulary_profile JSONB DEFAULT '{}',
  cadence_metrics JSONB DEFAULT '{}',
  sample_count INTEGER DEFAULT 0,
  last_calibrated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 17. aps_scores
CREATE TABLE aps_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  prompt_sophistication INTEGER NOT NULL,
  critical_evaluation INTEGER NOT NULL,
  creative_integration INTEGER NOT NULL,
  iterative_refinement INTEGER NOT NULL,
  ethical_awareness INTEGER NOT NULL,
  assessment_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- 18. ai_interactions
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES essays(id),
  context TEXT NOT NULL,
  interaction_type interaction_type NOT NULL,
  prompt_hash TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- 19. subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 21. analytics_events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX idx_scholarships_status ON scholarships(status);

CREATE INDEX idx_matches_student_status ON matches(student_id, status);
CREATE UNIQUE INDEX idx_matches_student_scholarship ON matches(student_id, scholarship_id);

CREATE INDEX idx_essays_student_status ON essays(student_id, status);

CREATE INDEX idx_fidelity_scores_student_essay ON fidelity_scores(student_id, essay_id);

CREATE INDEX idx_ai_interactions_student_created ON ai_interactions(student_id, created_at);

CREATE INDEX idx_analytics_user_event_created ON analytics_events(user_id, event_type, created_at);

-- ── Auth Trigger ─────────────────────────────────────────────────────────────
-- Automatically create a users row when a new auth.users entry is created

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role;
  new_user_id UUID;
BEGIN
  -- Get role from metadata, default to 'student'
  user_role_val := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'student'
  );

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_val
  )
  RETURNING id INTO new_user_id;

  -- Create the appropriate profile based on role
  IF user_role_val = 'student' THEN
    INSERT INTO public.student_profiles (user_id, graduation_year, state)
    VALUES (new_user_id, EXTRACT(YEAR FROM now())::INTEGER + 1, '');
  ELSIF user_role_val = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id)
    VALUES (new_user_id);
  ELSIF user_role_val = 'counselor' THEN
    INSERT INTO public.counselor_profiles (user_id)
    VALUES (new_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Updated_at Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_parent_profiles_updated_at BEFORE UPDATE ON parent_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_counselor_profiles_updated_at BEFORE UPDATE ON counselor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_institution_profiles_updated_at BEFORE UPDATE ON institution_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scholarships_updated_at BEFORE UPDATE ON scholarships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scholarship_providers_updated_at BEFORE UPDATE ON scholarship_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_fidelity_baselines_updated_at BEFORE UPDATE ON fidelity_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
