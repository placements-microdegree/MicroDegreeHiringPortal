ALTER TABLE cloud_drive_registrations
  ADD COLUMN IF NOT EXISTS highest_education_other text,
  ADD COLUMN IF NOT EXISTS aws_tools text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS aws_global_certification_details text,
  ADD COLUMN IF NOT EXISTS devops_certifications text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS devops_global_certification_details text;

CREATE INDEX IF NOT EXISTS idx_cloud_drive_registrations_aws_tools
  ON cloud_drive_registrations USING gin (aws_tools);

CREATE INDEX IF NOT EXISTS idx_cloud_drive_registrations_devops_certifications
  ON cloud_drive_registrations USING gin (devops_certifications);
