# MicroDegree Placement Portal (Backend)

Node.js + Express backend using Supabase (Auth + Postgres + Storage).

## Setup

1. Copy env

```bash
cp .env.example .env
```

2. Fill required env vars in `.env`

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for resume uploads unless you configure Storage policies for user uploads)

3. Install deps

```bash
npm i
```

4. Run

```bash
npm run dev
```

## Auth Flow

- Frontend logs in via Supabase.
- Frontend sends JWT in `Authorization: Bearer <token>`.
- Backend middleware validates token via Supabase and attaches `req.user`.

## API Endpoints

Auth

- `GET /api/auth/me` (Bearer token)

Profile (Student/Admin - self)

- `GET /api/profile/me` (Bearer token)
- `PUT /api/profile/me` (Bearer token)

Jobs

- `GET /api/jobs` (public)
- `POST /api/jobs` (ADMIN)
- `PUT /api/jobs/:id` (ADMIN)
- `DELETE /api/jobs/:id` (ADMIN)

Applications

- `POST /api/applications/apply` (STUDENT)
- `GET /api/applications/me` (STUDENT)
- `GET /api/applications` (ADMIN)
- `PATCH /api/applications/:id/status` (ADMIN)

Resumes

- `POST /api/resumes/upload` (STUDENT, multipart `files[]` up to 5)
- `GET /api/resumes/me` (STUDENT)

## Storage

- Uses Supabase Storage bucket: `resumes`.

## Required Supabase Tables (minimum)

You should create these tables in Supabase (names match the code):

### Quick fix for your current error

Your error `relation "public.profiles" does not exist` means the `profiles` table is missing.

Create it in Supabase SQL editor:

```sql
-- Enable UUID generation (Supabase usually has this already)
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text default 'STUDENT',
  location text,
  skills text[],
  experience_level text,
  experience_years text,
  current_ctc text,
  expected_ctc text,
  profile_photo_url text,
  updated_at timestamptz
);
```

- `profiles` (primary key `id` = auth user id)
  - `id` uuid (PK)
  - `full_name` text
  - `email` text
  - `phone` text
  - `role` text ("STUDENT" | "ADMIN")
  - `location` text
  - `skills` text[]
  - `experience_level` text
  - `experience_years` text
  - `current_ctc` text
  - `expected_ctc` text
  - `profile_photo_url` text
  - `updated_at` timestamptz

- `jobs`
  - `id` uuid (PK)
  - `title` text
  - `company` text
  - `description` text
  - `skills` text[]
  - `location` text
  - `ctc` text
  - `created_at` timestamptz default now()
  - `updated_at` timestamptz

- `applications`
  - `id` uuid (PK)
  - `student_id` uuid (FK -> profiles.id)
  - `job_id` uuid (FK -> jobs.id)
  - `status` text
  - `created_at` timestamptz default now()
  - `updated_at` timestamptz

- `resumes`
  - `id` uuid (PK)
  - `user_id` uuid (FK -> profiles.id)
  - `file_name` text
  - `file_url` text
  - `storage_path` text
  - `created_at` timestamptz default now()

## RLS Notes (recommended)

Enable RLS and add policies similar to:

- `profiles`: user can select/update where `id = auth.uid()`
- `applications`: student can select/insert where `student_id = auth.uid()`
- `jobs`: select for all; insert/update/delete only for ADMIN (based on JWT role claim)

Exact SQL depends on whether you store role in `auth.users.user_metadata` or in `profiles.role`.
