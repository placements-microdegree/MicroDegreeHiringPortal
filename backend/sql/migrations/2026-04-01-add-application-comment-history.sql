create extension if not exists pgcrypto;

create table if not exists public.application_comment_history (
  id bigserial primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  hr_comment text,
  hr_comment_2 text,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_comment_history_application_id
  on public.application_comment_history (application_id, created_at desc);
