-- Apply flow upgrade: profile carry-forward + application answers
-- Safe non-destructive migration

alter table public.profiles
  add column if not exists is_currently_working boolean,
  add column if not exists total_experience text,
  add column if not exists application_quota integer;

alter table public.profiles
  alter column application_quota set default 3;

update public.profiles
set application_quota = 3
where application_quota is null
  and role = 'STUDENT';

alter table public.profiles
  alter column application_quota drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_application_quota_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_application_quota_nonnegative
      check (application_quota is null or application_quota >= 0);
  end if;
end $$;

drop trigger if exists trg_set_eligibility on public.profiles;

alter table public.applications
  add column if not exists notice_period text,
  add column if not exists relevant_experience text,
  add column if not exists hands_on_primary_skills boolean,
  add column if not exists work_mode_match boolean,
  add column if not exists interview_mode_available boolean,
  add column if not exists jd_confirmed boolean,
  add column if not exists selected_resume_url text,
  add column if not exists save_for_future boolean;

alter table public.applications
  alter column jd_confirmed set default false,
  alter column save_for_future set default false;

update public.applications
set jd_confirmed = false
where jd_confirmed is null;

update public.applications
set save_for_future = false
where save_for_future is null;

alter table public.applications
  alter column jd_confirmed set not null,
  alter column save_for_future set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_jd_confirmed_check'
  ) then
    alter table public.applications
      add constraint applications_jd_confirmed_check
      check (jd_confirmed in (true, false));
  end if;
end $$;
