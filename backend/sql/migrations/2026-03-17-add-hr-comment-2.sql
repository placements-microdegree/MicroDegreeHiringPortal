-- Add second HR comment field for admin manage applications.

alter table public.applications
  add column if not exists hr_comment_2 text;
