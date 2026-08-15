-- Write-with-AI-or-not.
--
-- The student decides, per essay, whether the writing coach is present at all.
-- "solo" means no coach surface is rendered; "coached" means it is available.
-- The choice is also stamped on every revision, so the history is an honest
-- record of which passages were written with help and which were not — that
-- record is what any future fidelity score has to be grounded in.

DO $$ BEGIN
  CREATE TYPE assist_mode AS ENUM ('solo', 'coached');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE essays
  ADD COLUMN IF NOT EXISTS assist_mode assist_mode NOT NULL DEFAULT 'coached';

-- Nullable on revisions: rows written before this migration genuinely have no
-- recorded mode, and claiming one would be inventing history.
ALTER TABLE essay_revisions
  ADD COLUMN IF NOT EXISTS assist_mode assist_mode;

CREATE INDEX IF NOT EXISTS idx_essays_assist_mode ON essays (assist_mode);
