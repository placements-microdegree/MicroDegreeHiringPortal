-- Persist super admin favourite students selections.

create table if not exists public.superadmin_favorite_students (
  id bigint generated always as identity primary key,
  superadmin_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint superadmin_favorite_students_unique unique (superadmin_id, student_id)
);

create index if not exists idx_superadmin_favorite_students_superadmin
  on public.superadmin_favorite_students (superadmin_id);

create index if not exists idx_superadmin_favorite_students_student
  on public.superadmin_favorite_students (student_id);
