-- Track student interest on external jobs for super-admin analytics
alter table if exists public.external_jobs
  add column if not exists apply_click_count integer not null default 0,
  add column if not exists last_clicked_at timestamptz null;

update public.external_jobs
set apply_click_count = 0
where apply_click_count is null;

create index if not exists idx_external_jobs_apply_click_count
  on public.external_jobs (apply_click_count desc);
