-- Forgot-password OTP storage table
create table if not exists public.otp_codes (
  email text primary key,
  otp text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_otp_codes_expires_at
  on public.otp_codes (expires_at);
