-- Phase 3: Family linking and counselor-student relationships

-- Enums
DO $$ BEGIN
  CREATE TYPE family_link_status AS ENUM ('pending', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE link_method AS ENUM ('email', 'code');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Family links table
CREATE TABLE IF NOT EXISTS family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status family_link_status DEFAULT 'pending',
  link_method link_method NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- Link codes table
CREATE TABLE IF NOT EXISTS link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamp NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Counselor-student relationships
CREATE TABLE IF NOT EXISTS counselor_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE (counselor_id, student_id)
);

-- Row-level security for family_links
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read their own family links"
  ON family_links FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Students can read their own family links"
  ON family_links FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can create family links"
  ON family_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Students can update their family links"
  ON family_links FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Either party can delete family links"
  ON family_links FOR DELETE
  USING (auth.uid() = parent_id OR auth.uid() = student_id);

-- Row-level security for link_codes
ALTER TABLE link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own link codes"
  ON link_codes FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Anyone can read link codes for validation"
  ON link_codes FOR SELECT
  USING (true);

-- Row-level security for counselor_students
ALTER TABLE counselor_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counselors can read their student links"
  ON counselor_students FOR SELECT
  USING (auth.uid() = counselor_id);

CREATE POLICY "Students can read their counselor links"
  ON counselor_students FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Counselors can create student links"
  ON counselor_students FOR INSERT
  WITH CHECK (auth.uid() = counselor_id);

CREATE POLICY "Counselors can delete student links"
  ON counselor_students FOR DELETE
  USING (auth.uid() = counselor_id);

-- Auto-update timestamps
CREATE TRIGGER update_family_links_updated_at
  BEFORE UPDATE ON family_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
