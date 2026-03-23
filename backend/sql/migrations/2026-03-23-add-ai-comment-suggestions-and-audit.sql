create extension if not exists pgcrypto;

create table if not exists public.ai_comment_suggestions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  resume_url text,
  jd_url text,
  cache_key text not null,
  model_used text,
  prompt_version text not null default 'v1',
  fit_score integer,
  confidence text,
  hr_comment text,
  student_comment text,
  summary text,
  missing_requirements jsonb not null default '[]'::jsonb,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  quality_gate jsonb not null default '{}'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_ai_comment_suggestions_cache_key
  on public.ai_comment_suggestions (cache_key);

create index if not exists idx_ai_comment_suggestions_application_id
  on public.ai_comment_suggestions (application_id, created_at desc);

create table if not exists public.ai_comment_audit_events (
  id bigserial primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  suggestion_id uuid references public.ai_comment_suggestions(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_comment_audit_events_application_id
  on public.ai_comment_audit_events (application_id, created_at desc);

create index if not exists idx_ai_comment_audit_events_event_type
  on public.ai_comment_audit_events (event_type, created_at desc);
