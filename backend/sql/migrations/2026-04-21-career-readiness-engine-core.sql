begin;

alter table if exists public.profiles
  add column if not exists job_search_status text default 'PASSIVE',
  add column if not exists internal_flags text[] default '{}'::text[],
  add column if not exists active_resume_id uuid,
  add column if not exists profile_completion_percentage integer default 0,
  add column if not exists eligibility_snapshot jsonb default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'resumes'
  ) then
    execute 'alter table public.profiles drop constraint if exists profiles_active_resume_id_fkey';
    execute 'alter table public.profiles add constraint profiles_active_resume_id_fkey foreign key (active_resume_id) references public.resumes(id) on delete set null';
  end if;
end $$;

alter table if exists public.profiles
  drop constraint if exists profiles_job_search_status_check;

alter table if exists public.profiles
  add constraint profiles_job_search_status_check
  check (job_search_status in ('ACTIVE_NOW', 'PASSIVE', 'NOT_LOOKING', 'UNRESPONSIVE'));

alter table if exists public.profiles
  drop constraint if exists profiles_internal_flags_allowed_check;

alter table if exists public.profiles
  add constraint profiles_internal_flags_allowed_check
  check (internal_flags <@ array['RED_FLAG', 'ON_HOLD', 'BLACKLISTED']::text[]);

alter table if exists public.profiles
  drop constraint if exists profiles_profile_completion_percentage_range_check;

alter table if exists public.profiles
  add constraint profiles_profile_completion_percentage_range_check
  check (profile_completion_percentage between 0 and 100);

alter table if exists public.jobs
  add column if not exists opportunity_type text default 'REAL_OPPORTUNITY';

alter table if exists public.jobs
  drop constraint if exists jobs_opportunity_type_check;

alter table if exists public.jobs
  add constraint jobs_opportunity_type_check
  check (opportunity_type in ('REAL_OPPORTUNITY', 'PRACTICE_OPPORTUNITY'));

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'resumes'
  ) then
    execute 'alter table public.resumes add column if not exists approval_status text default ''PENDING''';
    execute 'alter table public.resumes add column if not exists approved_by uuid';
    execute 'alter table public.resumes add column if not exists approved_at timestamptz';
    execute 'alter table public.resumes add column if not exists rejection_reason text';

    execute 'alter table public.resumes drop constraint if exists resumes_approval_status_check';
    execute 'alter table public.resumes add constraint resumes_approval_status_check check (approval_status in (''PENDING'', ''APPROVED'', ''REJECTED''))';

    execute 'alter table public.resumes drop constraint if exists resumes_approved_by_fkey';
    execute 'alter table public.resumes add constraint resumes_approved_by_fkey foreign key (approved_by) references public.profiles(id) on delete set null';
  end if;
end $$;

create table if not exists public.profile_internal_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  source text not null default 'MANUAL',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_status_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  field_changed text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  source text not null default 'MANUAL'
);

create index if not exists idx_profiles_job_search_status on public.profiles(job_search_status);
create index if not exists idx_profiles_internal_flags on public.profiles using gin(internal_flags);
create index if not exists idx_profiles_active_resume_id on public.profiles(active_resume_id);
create index if not exists idx_jobs_opportunity_type on public.jobs(opportunity_type);
create index if not exists idx_profile_internal_notes_student_id on public.profile_internal_notes(student_id, created_at desc);
create index if not exists idx_profile_status_history_student_id on public.profile_status_history(student_id, changed_at desc);

commit;
