-- Add course_fee to profiles so eligibility can be persisted from students_enrolled_all.

alter table public.profiles
  add column if not exists course_fee integer;
