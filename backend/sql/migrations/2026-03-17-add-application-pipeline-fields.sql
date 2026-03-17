-- Add pipeline-friendly status fields to applications.
-- Keeps legacy status column while introducing stage/sub_stage and reliable on-behalf tracking.

alter table public.applications
  add column if not exists stage text,
  add column if not exists sub_stage text,
  add column if not exists is_applied_on_behalf boolean not null default false;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (
    status = any (
      array[
        'Applied'::text,
        'Shortlisted'::text,
        'Resume Screening Rejected'::text,
        'Profile Mapped for client'::text,
        'Interview'::text,
        'Interview Scheduled'::text,
        'Interview Not Cleared'::text,
        'Technical Round'::text,
        'Final Round'::text,
        'Selected'::text,
        'Placed'::text,
        'Client Rejected'::text,
        'Rejected'::text,
        'Position Closed'::text
      ]
    )
  );

alter table public.applications
  drop constraint if exists applications_stage_check;

alter table public.applications
  add constraint applications_stage_check
  check (
    stage is null
    or stage = any (
      array[
        'Applied'::text,
        'Screening'::text,
        'Mapped'::text,
        'Interview'::text,
        'Final'::text,
        'Closed'::text
      ]
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
        'Applied'::text,
        'Shortlisted'::text,
        'Resume Screening Rejected'::text,
        'Profile Mapped for client'::text,
        'Interview Scheduled'::text,
        'Interview Not Cleared'::text,
        'Technical Round'::text,
        'Final Round'::text,
        'Placed'::text,
        'Rejected'::text,
        'Position Closed'::text,
        'Client Rejected'::text,
        'Interview'::text,
        'Selected'::text
      ]
    )
  );

update public.applications
set
  sub_stage = case
    when status = 'Applied' then 'Applied'
    when status = 'Shortlisted' then 'Shortlisted'
    when status = 'Resume Screening Rejected' then 'Resume Screening Rejected'
    when status = 'Profile Mapped for client' then 'Profile Mapped for client'
    when status in ('Interview', 'Interview Scheduled') then 'Interview Scheduled'
    when status = 'Interview Not Cleared' then 'Interview Not Cleared'
    when status = 'Technical Round' then 'Technical Round'
    when status = 'Final Round' then 'Final Round'
    when status in ('Selected', 'Placed') then 'Placed'
    when status = 'Client Rejected' then 'Client Rejected'
    when status = 'Rejected' then 'Rejected'
    when status = 'Position Closed' then 'Position Closed'
    else 'Applied'
  end,
  stage = case
    when status = 'Applied' then 'Applied'
    when status in ('Shortlisted', 'Resume Screening Rejected') then 'Screening'
    when status = 'Profile Mapped for client' then 'Mapped'
    when status in ('Interview', 'Interview Scheduled', 'Interview Not Cleared', 'Technical Round') then 'Interview'
    when status = 'Final Round' then 'Final'
    when status in ('Selected', 'Placed', 'Rejected', 'Position Closed', 'Client Rejected') then 'Closed'
    else 'Applied'
  end
where stage is null or sub_stage is null;

create index if not exists idx_applications_stage
  on public.applications(stage);

create index if not exists idx_applications_sub_stage
  on public.applications(sub_stage);

create index if not exists idx_applications_is_applied_on_behalf
  on public.applications(is_applied_on_behalf);
