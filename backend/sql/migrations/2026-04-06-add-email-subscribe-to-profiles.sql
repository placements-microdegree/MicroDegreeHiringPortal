-- Add per-student premium job email subscription preference.
-- Existing records are backfilled from eligibility state.

alter table public.profiles
  add column if not exists email_subscribe boolean;

update public.profiles
set email_subscribe = case
  when role = 'STUDENT' and coalesce(is_eligible, false) = true then true
  else false
end
where email_subscribe is null;

alter table public.profiles
  alter column email_subscribe set default false,
  alter column email_subscribe set not null;

create or replace function public.sync_profile_email_subscribe()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.role, 'STUDENT') <> 'STUDENT' then
    new.email_subscribe := false;
    return new;
  end if;

  -- On insert, derive default from eligibility when value is missing.
  if tg_op = 'INSERT' and new.email_subscribe is null then
    new.email_subscribe := coalesce(new.is_eligible, false);
  end if;

  -- Students who are not eligible cannot remain subscribed.
  if coalesce(new.is_eligible, false) = false then
    new.email_subscribe := false;
  elsif new.email_subscribe is null then
    new.email_subscribe := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email_subscribe on public.profiles;

create trigger trg_sync_profile_email_subscribe
before insert or update of role, is_eligible, email_subscribe
on public.profiles
for each row
execute function public.sync_profile_email_subscribe();
