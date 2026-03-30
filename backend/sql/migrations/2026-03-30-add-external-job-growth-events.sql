-- Track external-job viral funnel events: share, visit, and apply click with attribution.
create table if not exists public.external_job_growth_events (
  id bigserial primary key,
  event_type text not null check (event_type in ('share', 'visit', 'apply_click')),
  job_id uuid null references public.external_jobs(id) on delete cascade,
  student_id uuid null references public.profiles(id) on delete set null,
  ref_student_id uuid null references public.profiles(id) on delete set null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  share_channel text null,
  visitor_token text null,
  landing_path text null,
  user_agent text null,
  ip_address text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_external_job_growth_events_created_at
  on public.external_job_growth_events (created_at desc);

create index if not exists idx_external_job_growth_events_event_type
  on public.external_job_growth_events (event_type);

create index if not exists idx_external_job_growth_events_job_id
  on public.external_job_growth_events (job_id);

create index if not exists idx_external_job_growth_events_ref_student_id
  on public.external_job_growth_events (ref_student_id);

create index if not exists idx_external_job_growth_events_utm
  on public.external_job_growth_events (utm_source, utm_medium, utm_campaign);
