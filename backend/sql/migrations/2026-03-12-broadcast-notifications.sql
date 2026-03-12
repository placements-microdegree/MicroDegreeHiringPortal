-- Convert notifications to support broadcast (single-row) notifications.
-- A notification with user_id = NULL is visible to ALL students.
-- A separate table tracks which users have dismissed/read each broadcast.

-- 1. Allow user_id to be NULL (broadcast)
alter table public.notifications
  alter column user_id drop not null;

-- 2. Create a read-tracking table for broadcast notifications
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  read_at         timestamptz not null default now(),
  constraint notification_reads_pkey primary key (notification_id, user_id)
);

create index if not exists idx_notification_reads_user
  on public.notification_reads using btree (user_id);

-- 3. Clean up old per-user job_posted rows (optional, keeps table lean)
--    Uncomment the line below if you want to purge existing per-user job_posted rows:
-- delete from public.notifications where type = 'job_posted' and user_id is not null;
