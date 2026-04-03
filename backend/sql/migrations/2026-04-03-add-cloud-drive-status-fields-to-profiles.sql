ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cloud_drive_status text,
  ADD COLUMN IF NOT EXISTS drive_cleared_date date,
  ADD COLUMN IF NOT EXISTS drive_cleared_status text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cloud_drive_status_history jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_cloud_drive_status
  ON profiles(cloud_drive_status);
