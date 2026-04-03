ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cloud_drive_status_history jsonb DEFAULT '[]'::jsonb;
