-- Fix superadmin favorites FK: superadmin_id should map to auth user id.

alter table if exists public.superadmin_favorite_students
  drop constraint if exists superadmin_favorite_students_superadmin_id_fkey;

alter table if exists public.superadmin_favorite_students
  add constraint superadmin_favorite_students_superadmin_id_fkey
  foreign key (superadmin_id)
  references auth.users(id)
  on delete cascade;
