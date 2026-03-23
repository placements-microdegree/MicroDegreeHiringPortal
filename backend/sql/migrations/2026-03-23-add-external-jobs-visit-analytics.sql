-- Track visits to student external-jobs page for super-admin analytics
create table if not exists public.external_jobs_page_visits (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz not null default now()
);

create index if not exists idx_external_jobs_page_visits_student_id
  on public.external_jobs_page_visits (student_id);

create index if not exists idx_external_jobs_page_visits_visited_at
  on public.external_jobs_page_visits (visited_at desc);