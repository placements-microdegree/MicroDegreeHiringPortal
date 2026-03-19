-- Student-referred company job openings.

create table if not exists public.student_job_referrals (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  role_details text not null,
  job_location text not null,
  connection_type text not null
    check (connection_type in ('i_work_here', 'friend_works_here', 'saw_online')),
  comments text null,
  confirmation_acknowledged boolean not null default false,
  follow_up_type text null
    check (follow_up_type in ('direct_referral', 'share_contact', 'team_decide')),
  follow_up_contact text null,
  follow_up_note text null,
  status text not null default 'awaiting_followup'
    check (status in ('awaiting_followup', 'submitted', 'reviewed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_student_job_referrals_student_id
  on public.student_job_referrals (student_id);

create index if not exists idx_student_job_referrals_created_at
  on public.student_job_referrals (created_at desc);
