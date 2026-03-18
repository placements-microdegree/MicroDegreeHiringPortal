-- Restrict application statuses to the requested status flow.
-- This migration first remaps legacy values to new canonical statuses.

begin;

alter table public.applications
  drop constraint if exists applications_stage_sub_stage_check;

alter table public.applications
  drop constraint if exists applications_sub_stage_check;

alter table public.applications
  drop constraint if exists applications_status_check;

update public.applications
set sub_stage = case coalesce(nullif(trim(sub_stage), ''), nullif(trim(status), ''), 'Applied')
  when 'Applied' then 'Applied'
  when 'Resume Not Matched' then 'Resume Not Matched'
  when 'Mapped to Client' then 'Mapped to Client'
  when 'Screening call Received' then 'Screening call Received'
  when 'Screeing Discolified' then 'screening Discolified'
  when 'screening Discolified' then 'screening Discolified'
  when 'Interview scheduled' then 'Interview scheduled'
  when 'Technical Round' then 'Technical Round'
  when 'final Round' then 'final Round'
  when 'Interview Not Cleared' then 'Interview Not Cleared'
  when 'Placed' then 'Placed'
  when 'Job on hold' then 'Job on hold'
  when 'Position closed' then 'Position closed'
  when 'Shortlisted' then 'Screening call Received'
  when 'Resume Screening Rejected' then 'Resume Not Matched'
  when 'Profile Mapped for client' then 'Mapped to Client'
  when 'Interview Scheduled' then 'Interview scheduled'
  when 'Final Round' then 'final Round'
  when 'Position Closed' then 'Position closed'
  when 'Job on hold/ position closed' then 'Position closed'
  when 'Client Rejected' then 'screening Discolified'
  when 'Rejected' then 'screening Discolified'
  when 'Interview' then 'Interview scheduled'
  when 'Selected' then 'Placed'
  else 'Applied'
end;

update public.applications
set status = sub_stage;

update public.applications
set stage = case sub_stage
  when 'Applied' then 'Applied'
  when 'Resume Not Matched' then 'Screening'
  when 'Screening call Received' then 'Screening'
  when 'screening Discolified' then 'Screening'
  when 'Mapped to Client' then 'Mapped'
  when 'Interview scheduled' then 'Interview'
  when 'Technical Round' then 'Interview'
  when 'Interview Not Cleared' then 'Interview'
  when 'final Round' then 'Final'
  when 'Placed' then 'Closed'
  when 'Job on hold' then 'Closed'
  when 'Position closed' then 'Closed'
  else 'Applied'
end;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'Applied',
      'Resume Not Matched',
      'Mapped to Client',
      'Screening call Received',
      'screening Discolified',
      'Interview scheduled',
      'Technical Round',
      'final Round',
      'Interview Not Cleared',
      'Placed',
      'Job on hold',
      'Position closed'
    )
  );

alter table public.applications
  add constraint applications_sub_stage_check
  check (
    sub_stage is null
    or sub_stage = any (
      array[
        'Applied',
        'Resume Not Matched',
        'Mapped to Client',
        'Screening call Received',
        'screening Discolified',
        'Interview scheduled',
        'Technical Round',
        'final Round',
        'Interview Not Cleared',
        'Placed',
        'Job on hold',
        'Position closed'
      ]::text[]
    )
  );

alter table public.applications
  add constraint applications_stage_sub_stage_check
  check (
    (
      (stage = 'Applied' and sub_stage = 'Applied')
      or (stage = 'Screening' and sub_stage in ('Resume Not Matched', 'Screening call Received', 'screening Discolified'))
      or (stage = 'Mapped' and sub_stage = 'Mapped to Client')
      or (stage = 'Interview' and sub_stage in ('Interview scheduled', 'Technical Round', 'Interview Not Cleared'))
      or (stage = 'Final' and sub_stage = 'final Round')
      or (stage = 'Closed' and sub_stage in ('Placed', 'Job on hold', 'Position closed'))
    )
  );

commit;
