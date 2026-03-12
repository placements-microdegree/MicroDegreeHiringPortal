-- Sync selected_resume_url from applications to profiles.resume_url
-- Fires on INSERT or UPDATE of selected_resume_url on applications.

create or replace function public.sync_latest_resume_to_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act when selected_resume_url is not null
  if new.selected_resume_url is not null then
    update public.profiles
       set resume_url   = new.selected_resume_url,
           updated_at   = now()
     where id = new.student_id;
  end if;

  return new;
end;
$$;

-- Drop the trigger first (idempotent re-run)
drop trigger if exists trg_sync_resume_to_profile on public.applications;

-- Re-create trigger
create trigger trg_sync_resume_to_profile
  after insert or update of selected_resume_url
  on public.applications
  for each row
  execute function sync_latest_resume_to_profile();
