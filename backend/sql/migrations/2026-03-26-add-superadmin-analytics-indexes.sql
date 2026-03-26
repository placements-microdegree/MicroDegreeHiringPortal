-- Performance indexes for super admin analytics dashboard queries.
-- Safe to run multiple times.

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_role_is_eligible on profiles(role, is_eligible);
create index if not exists idx_profiles_role_application_quota on profiles(role, application_quota);
create index if not exists idx_profiles_created_at on profiles(created_at);
create index if not exists idx_profiles_updated_at on profiles(updated_at);

create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_created_at on jobs(created_at);
create index if not exists idx_jobs_valid_till on jobs(valid_till);
create index if not exists idx_jobs_status_valid_till on jobs(status, valid_till);

create index if not exists idx_applications_status on applications(status);
create index if not exists idx_applications_created_at on applications(created_at);
create index if not exists idx_applications_updated_at on applications(updated_at);
