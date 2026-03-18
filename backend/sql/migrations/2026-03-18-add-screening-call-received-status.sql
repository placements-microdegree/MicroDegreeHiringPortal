-- Add new application status: Screening call Received
-- Keeps pipeline constraints aligned with stage/sub_stage rules.

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'Applied',
      'Screening call Received',
      'Shortlisted',
      'Resume Screening Rejected',
      'Profile Mapped for client',
      'Interview Scheduled',
      'Interview Not Cleared',
      'Technical Round',
      'Final Round',
      'Placed',
      'Rejected',
      'Position Closed',
      'Client Rejected',
      -- legacy
      'Interview',
      'Selected'
    )
  );

alter table public.applications
  drop constraint if exists applications_sub_stage_check;

alter table public.applications
  add constraint applications_sub_stage_check
  check (
    sub_stage is null
    or sub_stage = any (
      array[
        'Applied',
        'Screening call Received',
        'Shortlisted',
        'Resume Screening Rejected',
        'Profile Mapped for client',
        'Interview Scheduled',
        'Interview Not Cleared',
        'Technical Round',
        'Final Round',
        'Placed',
        'Rejected',
        'Position Closed',
        'Client Rejected'
      ]::text[]
    )
  );

alter table public.applications
  drop constraint if exists applications_stage_sub_stage_check;

alter table public.applications
  add constraint applications_stage_sub_stage_check
  check (
    (
      (stage = 'Applied' and sub_stage = 'Applied')
      or (stage = 'Screening' and sub_stage in ('Screening call Received', 'Shortlisted', 'Resume Screening Rejected'))
      or (stage = 'Mapped' and sub_stage = 'Profile Mapped for client')
      or (stage = 'Interview' and sub_stage in ('Interview Scheduled', 'Interview Not Cleared', 'Technical Round'))
      or (stage = 'Final' and sub_stage = 'Final Round')
      or (stage = 'Closed' and sub_stage in ('Placed', 'Rejected', 'Position Closed', 'Client Rejected'))
    )
  );
