-- Track job share activity for external jobs analytics
alter table if exists public.external_jobs
  add column if not exists share_count integer not null default 0,
  add column if not exists last_shared_at timestamptz null;

update public.external_jobs
set share_count = 0
where share_count is null;

create index if not exists idx_external_jobs_share_count
  on public.external_jobs (share_count desc);
