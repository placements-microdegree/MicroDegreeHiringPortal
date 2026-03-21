-- Migration: add cloud_drives and cloud_drive_registrations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cloud_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_date date,
  drive_time timestamptz,
  zoom_link text,
  passcode text,
  notes text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_drive_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid REFERENCES cloud_drives(id) ON DELETE SET NULL,
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  current_location text,
  ready_to_relocate boolean DEFAULT false,
  highest_education text,
  total_experience text,
  aws_experience text,
  domain text,
  aws_cert boolean DEFAULT false,
  devops_cert boolean DEFAULT false,
  institute_name text,
  source text,
  microdegree_certified boolean DEFAULT false,
  batch text,
  status text,
  registered_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_drive_unique_registration ON cloud_drive_registrations(drive_id, profile_id);
