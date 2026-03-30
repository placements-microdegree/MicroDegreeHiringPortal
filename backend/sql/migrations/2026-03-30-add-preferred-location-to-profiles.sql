ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_location text;

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_location
  ON profiles(preferred_location);
