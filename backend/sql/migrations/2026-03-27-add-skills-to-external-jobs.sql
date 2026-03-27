-- Add skills support for external jobs upload and filtering.
alter table if exists public.external_jobs
  add column if not exists skills text[];
