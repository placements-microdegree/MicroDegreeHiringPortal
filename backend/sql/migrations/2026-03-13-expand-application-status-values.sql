-- Expand allowed values for applications.status to include new pipeline stages.
-- Drops the existing constraint and replaces it with the full list.

-- Drop the existing constraint (if it exists)
alter table public.applications
  drop constraint if exists applications_status_check;

-- Add updated constraint with all current allowed status values
alter table public.applications
  add constraint applications_status_check
  check (status in (
    'Applied',
    'Shortlisted',
    'Interview',
    'Selected',
    'Resume Screening Rejected',
    'Profile Mapped for client',
    'Client Rejected',
    'Rejected'
  ))
  not valid;
