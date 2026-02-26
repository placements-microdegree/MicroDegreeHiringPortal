-- Safe, non-destructive upgrade for job expiry + status lifecycle.
-- Existing rows are normalized so constraints can be applied safely.

alter table public.jobs
  add column if not exists valid_till date;

update public.jobs
set status = case
  when status is null or btrim(status) = '' then 'active'
  when lower(btrim(status)) in ('active', 'closed', 'deleted') then lower(btrim(status))
  else 'active'
end;

alter table public.jobs
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_status_allowed_check'
  ) then
    alter table public.jobs
      add constraint jobs_status_allowed_check
      check (status in ('active', 'closed', 'deleted'));
  end if;
end $$;
