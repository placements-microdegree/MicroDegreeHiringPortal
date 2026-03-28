-- Track every external job apply click to support per-day analytics

create table if not exists public.external_job_apply_clicks (
  id bigserial primary key,
  job_id uuid not null references public.external_jobs(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_external_job_apply_clicks_job_id
  on public.external_job_apply_clicks (job_id);

create index if not exists idx_external_job_apply_clicks_clicked_at
  on public.external_job_apply_clicks (clicked_at desc);

create index if not exists idx_external_job_apply_clicks_job_id_clicked_at
  on public.external_job_apply_clicks (job_id, clicked_at desc);

-- Aggregate click analytics for a given time window
create or replace function public.get_external_job_click_analytics(
  start_ts timestamptz,
  end_ts timestamptz
)
returns table (
  job_id uuid,
  click_count bigint,
  last_clicked_at timestamptz
)
language sql
stable
as $$
  select
    c.job_id,
    count(*) as click_count,
    max(c.clicked_at) as last_clicked_at
  from public.external_job_apply_clicks c
  where c.clicked_at >= start_ts
    and c.clicked_at < end_ts
  group by c.job_id;
$$;
