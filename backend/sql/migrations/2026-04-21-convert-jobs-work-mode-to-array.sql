begin;

alter table public.jobs
  drop constraint if exists jobs_work_mode_check;

do $$
declare
  current_udt text;
begin
  select c.udt_name
  into current_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'jobs'
    and c.column_name = 'work_mode';

  if current_udt = 'text' then
    execute $sql$
      alter table public.jobs
      alter column work_mode type text[]
      using (
        case
          when work_mode is null or btrim(work_mode) = '' then '{}'::text[]
          when position(',' in work_mode) > 0 then array_remove(regexp_split_to_array(work_mode, '\s*,\s*'), '')
          else array[trim(work_mode)]
        end
      )
    $sql$;
  elsif current_udt is null then
    execute 'alter table public.jobs add column work_mode text[]';
  end if;
end $$;

update public.jobs
set work_mode = '{}'::text[]
where work_mode is null;

alter table public.jobs
  alter column work_mode set default '{}'::text[];

alter table public.jobs
  add constraint jobs_work_mode_check
  check (work_mode <@ array['Remote', 'Hybrid', 'Onsite']::text[]);

commit;
