-- Add playlist support for favourite students shared across admin and superadmin views.

create table if not exists public.superadmin_favorite_playlists (
  id bigint generated always as identity primary key,
  superadmin_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default now(),
  constraint superadmin_favorite_playlists_superadmin_name_unique unique (superadmin_id, name)
);

create index if not exists idx_superadmin_favorite_playlists_superadmin
  on public.superadmin_favorite_playlists (superadmin_id);

create table if not exists public.superadmin_favorite_playlist_students (
  id bigint generated always as identity primary key,
  playlist_id bigint not null references public.superadmin_favorite_playlists(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint superadmin_favorite_playlist_students_unique unique (playlist_id, student_id)
);

create index if not exists idx_superadmin_favorite_playlist_students_playlist
  on public.superadmin_favorite_playlist_students (playlist_id);

create index if not exists idx_superadmin_favorite_playlist_students_student
  on public.superadmin_favorite_playlist_students (student_id);
