-- Auto-sync student course_fee and eligibility in profiles.

create or replace function public.set_student_profile_eligibility()
returns trigger
language plpgsql
as $$
declare
  matched_course_fee integer;
  profile_created_at timestamptz;
  profile_expiry timestamptz;
begin
  if coalesce(new.role, 'STUDENT') <> 'STUDENT' then
    return new;
  end if;

  profile_created_at := coalesce(new.created_at, now());
  profile_expiry := profile_created_at + interval '2 years';

  select s.course_fee
    into matched_course_fee
  from public.students_enrolled_all s
  where (
    new.email is not null
    and lower(trim(s.email)) = lower(trim(new.email))
  )
  or (
    new.phone is not null
    and right(regexp_replace(coalesce(s.phone, ''), '\\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(new.phone, ''), '\\D', '', 'g'), 10)
  )
  order by
    case
      when new.email is not null
        and lower(trim(s.email)) = lower(trim(new.email)) then 0
      else 1
    end,
    s.created_at desc
  limit 1;

  if matched_course_fee is not null then
    new.course_fee := matched_course_fee;
  end if;

  if coalesce(new.course_fee, 0) >= 7000 and now() <= profile_expiry then
    new.is_eligible := true;
    new.eligible_until := profile_expiry;
    new.application_quota := coalesce(new.application_quota, 3);
  else
    new.is_eligible := false;
    new.eligible_until := null;
    new.application_quota := 3;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_profile_eligibility on public.profiles;

create trigger trg_set_profile_eligibility
before insert or update of email, phone, role, created_at
on public.profiles
for each row
execute function public.set_student_profile_eligibility();
