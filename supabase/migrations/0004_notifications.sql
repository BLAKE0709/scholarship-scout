-- Phase 3: Notification engine

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'deadline_warning', 'match_new', 'application_update',
    'score_updated', 'nudge', 'system', 'achievement'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  metadata jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  emailed boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_notifications_user_read_created
  ON notifications (user_id, read, created_at);

-- Row-level security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
