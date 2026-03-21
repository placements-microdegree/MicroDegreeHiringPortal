ALTER TABLE cloud_drives
  ADD COLUMN IF NOT EXISTS title text DEFAULT 'Career Assistance',
  ADD COLUMN IF NOT EXISTS registration_close_at timestamptz;

ALTER TABLE cloud_drive_registrations
  ADD COLUMN IF NOT EXISTS relocation_preference text;
