-- Align applications table with pipeline constraints, trigger sync, indexes,
-- and add two-option HR comment type support.

alter table public.applications
  add column if not exists hr_comment_type text;

update public.applications
set hr_comment_type = 'Internal'
where hr_comment_type is null;

alter table public.applications
  alter column hr_comment_type set default 'Internal';

alter table public.applications
  drop constraint if exists applications_hr_comment_type_check;

alter table public.applications
  add constraint applications_hr_comment_type_check
  check (hr_comment_type in ('Internal', 'Client'));

alter table public.applications
  drop constraint if exists applications_stage_sub_stage_check;

alter table public.applications
  add constraint applications_stage_sub_stage_check
  check (
    (
      (stage = 'Applied' and sub_stage = 'Applied')
      or (stage = 'Screening' and sub_stage in ('Shortlisted', 'Resume Screening Rejected'))
      or (stage = 'Mapped' and sub_stage = 'Profile Mapped for client')
      or (stage = 'Interview' and sub_stage in ('Interview Scheduled', 'Interview Not Cleared', 'Technical Round'))
      or (stage = 'Final' and sub_stage = 'Final Round')
      or (stage = 'Closed' and sub_stage in ('Placed', 'Rejected', 'Position Closed', 'Client Rejected'))
    )
  );

create index if not exists idx_applications_job_stage
  on public.applications(job_id, stage);

create index if not exists idx_applications_job_sub_stage
  on public.applications(job_id, sub_stage);

create index if not exists idx_applications_on_behalf
  on public.applications(is_applied_on_behalf);

create or replace function public.sync_application_status_from_sub_stage()
returns trigger
language plpgsql
as $$
begin
  if new.sub_stage is not null then
    new.status := new.sub_stage;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_application_status_from_sub_stage on public.applications;

create trigger trg_sync_application_status_from_sub_stage
before insert or update of sub_stage
on public.applications
for each row
execute function public.sync_application_status_from_sub_stage();
