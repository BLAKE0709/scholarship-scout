-- Additive adult-support rollout. Existing school grades and application history remain.
BEGIN;
ALTER TABLE student_profiles ALTER COLUMN graduation_year DROP NOT NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS education_profile jsonb;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS funding jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS eligibility_status text NOT NULL DEFAULT 'needs_information';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS eligibility_reasons text[] NOT NULL DEFAULT '{}';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS eligibility_missing_fields text[] NOT NULL DEFAULT '{}';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_concerns text[] NOT NULL DEFAULT '{}';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_eligibility_status_check') THEN
    ALTER TABLE matches ADD CONSTRAINT matches_eligibility_status_check CHECK (eligibility_status IN ('eligible', 'ineligible', 'needs_information'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_education_profile_version_check') THEN
    ALTER TABLE student_profiles ADD CONSTRAINT student_education_profile_version_check CHECK (education_profile IS NULL OR (COALESCE(jsonb_typeof(education_profile) = 'object' AND jsonb_typeof(education_profile->'version') = 'number' AND education_profile->>'version' = '1', false)));
  END IF;
END $$;
COMMIT;
