-- Track Resume Builder opens by students for super-admin analytics
create table if not exists public.resume_builder_clicks (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_resume_builder_clicks_student_id
  on public.resume_builder_clicks (student_id);

create index if not exists idx_resume_builder_clicks_clicked_at
  on public.resume_builder_clicks (clicked_at desc);
