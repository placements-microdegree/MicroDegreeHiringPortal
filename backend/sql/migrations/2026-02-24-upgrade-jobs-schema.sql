-- Safe, non-destructive schema upgrade for public.jobs
-- Adds new columns without dropping or rewriting existing data.

alter table public.jobs
  add column if not exists jd_link text,
  add column if not exists experience text,
  add column if not exists work_mode text,
  add column if not exists notice_period text,
  add column if not exists interview_mode text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_work_mode_check'
  ) then
    alter table public.jobs
      add constraint jobs_work_mode_check
      check (work_mode is null or work_mode in ('Remote', 'Hybrid', 'Onsite'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_interview_mode_check'
  ) then
    alter table public.jobs
      add constraint jobs_interview_mode_check
      check (interview_mode is null or interview_mode in ('Online', 'Offline', 'Hybrid'))
      not valid;
  end if;
end $$;
