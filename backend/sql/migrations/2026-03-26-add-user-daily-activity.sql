-- Accurate DAU source table.
-- One row per user per UTC date.

create table if not exists user_daily_activity (
  id bigserial primary key,
  user_id uuid not null,
  role text,
  activity_date date not null,
  method text,
  path text,
  first_activity_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_daily_activity_unique_user_date unique (user_id, activity_date)
);

create index if not exists idx_user_daily_activity_date
  on user_daily_activity(activity_date);

create index if not exists idx_user_daily_activity_user
  on user_daily_activity(user_id);
