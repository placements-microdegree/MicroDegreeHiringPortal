-- Migration: create table for admin-posted daily sessions shown to students
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS daily_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  days text NOT NULL,
  session_time text NOT NULL,
  meeting_id text NOT NULL,
  passcode text,
  registration_link text,
  join_mode text NOT NULL DEFAULT 'api',
  after_button_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_sessions_join_mode_check CHECK (join_mode IN ('api', 'link'))
);

CREATE INDEX IF NOT EXISTS idx_daily_sessions_is_active
  ON daily_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_daily_sessions_created_at
  ON daily_sessions(created_at DESC);
