ALTER TABLE cloud_drive_registrations
  ADD COLUMN IF NOT EXISTS current_status text,
  ADD COLUMN IF NOT EXISTS relevant_experience text,
  ADD COLUMN IF NOT EXISTS current_last_role text,
  ADD COLUMN IF NOT EXISTS transitioning_to_cloud_devops boolean,
  ADD COLUMN IF NOT EXISTS non_it_field text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS track text,
  ADD COLUMN IF NOT EXISTS has_aws_hands_on boolean,
  ADD COLUMN IF NOT EXISTS aws_certifications text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS has_devops_hands_on boolean,
  ADD COLUMN IF NOT EXISTS devops_tools text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS job_intent text,
  ADD COLUMN IF NOT EXISTS current_ctc numeric(12,2),
  ADD COLUMN IF NOT EXISTS expected_ctc numeric(12,2),
  ADD COLUMN IF NOT EXISTS notice_period text,
  ADD COLUMN IF NOT EXISTS currently_working boolean,
  ADD COLUMN IF NOT EXISTS commitment_full_drive boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commitment_serious_roles boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commitment_selection_performance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS backend_tags jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cloud_drive_registrations_track
  ON cloud_drive_registrations(track);

CREATE INDEX IF NOT EXISTS idx_cloud_drive_registrations_current_status
  ON cloud_drive_registrations(current_status);

CREATE INDEX IF NOT EXISTS idx_cloud_drive_registrations_job_intent
  ON cloud_drive_registrations(job_intent);
