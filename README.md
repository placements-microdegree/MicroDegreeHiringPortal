# MicroDegree Hiring Portal

A role-based placement platform that takes a student from profile setup through career readiness, real-job applications, and HR-managed hiring pipelines. The same codebase serves three portals — Student, Admin/HR, and Super Admin — backed by a single Express API and Supabase (Postgres + Auth + Storage).

> Looking for the deep design dive? See [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Database Migrations](#database-migrations)
- [Available Scripts](#available-scripts)
- [Key Features](#key-features)
- [Public Landing Page (`/home`)](#public-landing-page-home)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
React SPA (Vite)  ──fetch──>  Express API  ──>  Supabase (Postgres + Auth + Storage)
   │                              │
   ├── Auth context                ├── Cookie + Bearer auth (mdpp_access_token / mdpp_refresh_token)
   ├── Role-guarded routes         ├── Route → Controller → Service → Supabase
   └── Domain service wrappers     └── Career-readiness engine reused across jobs/apps/email
```

- **Backend style:** route → controller → service → Supabase query. No ORM/models layer.
- **Frontend style:** route/page-driven UI with `services/*` API wrappers; auth state lives in React context, not Redux.
- **Auth model:** backend sets `mdpp_access_token` and `mdpp_refresh_token` cookies; middleware also accepts `Bearer` tokens and can restore a session from the refresh token.
- **Deployment shape:** Netlify hosts the SPA and rewrites `/api/*` to the DigitalOcean-hosted Express backend so browser auth cookies stay first-party.

---

## Tech Stack

**Frontend** — React 19, React Router 7, Vite 7, Tailwind CSS 4, Framer Motion 12, React Icons, React Toastify, SweetAlert2, Recharts, XLSX, jsPDF.

**Backend** — Node.js, Express 5 (CommonJS), Multer, Nodemailer, pdf-parse, jsonwebtoken, cookie-parser.

**Database / Auth / Storage** — Supabase Postgres + Supabase Auth + Supabase Storage (`resumes` bucket).

**Integrations** — Google OAuth (Supabase PKCE), Anthropic Claude (AI HR comment suggestions), Zoom account-credentials API (daily session join links), SMTP (job alerts + password-reset OTP).

---

## Repository Layout

```
MicroDegreeHiringPortal/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express assembly, CORS, cookies, route mounting
│   │   ├── routes/                 # endpoint registry per domain
│   │   ├── controllers/            # thin HTTP adapters
│   │   ├── services/               # business logic + Supabase access
│   │   ├── middleware/             # verifyToken, authorizeRole, apiCache
│   │   └── utils/                  # constants, helpers
│   ├── sql/migrations/             # schema history (apply in order)
│   └── data/dailySessions.settings.json
└── frontend/
    ├── public/                     # static assets (logos, JobTemplate.xlsx)
    └── src/
        ├── routes/AppRoutes.jsx    # full route map + role segmentation
        ├── context/                # AuthProvider / authStore
        ├── services/               # domain API wrappers (auth, job, application, …)
        ├── pages/
        │   ├── Home.jsx            # public landing page (/home)
        │   ├── auth/               # login, signup, complete-profile, forgot-password
        │   ├── student/            # student portal pages
        │   ├── admin/              # HR portal pages
        │   └── superadmin/         # super-admin portal pages
        └── components/
            ├── layout/             # DashboardLayout, Sidebar, Navbar, NotificationBell
            ├── student/            # job/apply/profile helpers
            ├── admin/              # HR tables, JD form, StudentProfileModal
            └── common/             # buttons, inputs, footer, shimmer, etc.
```

---

## Prerequisites

- **Node.js** 18+ (Express 5 and Vite 7 expect a current LTS)
- **npm** 9+
- A **Supabase project** (URL, anon key, service-role key)
- Optional: SMTP credentials, Anthropic Claude key, Zoom Server-to-Server OAuth app

---

## Environment Variables

### Frontend — `frontend/.env`

```bash
VITE_API_BASE_URL=http://localhost:5000          # local backend; Netlify uses same-origin /api
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Backend — `backend/.env`

**Core (required):**

```bash
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>      # required for admin / public-tracking flows
FRONTEND_ORIGIN=http://localhost:5173             # or comma-separated FRONTEND_ORIGINS
BACKEND_ORIGIN=http://localhost:5000
API_CACHE_TTL_SECONDS=60
```

**Optional — OTP:**

```bash
OTP_HASH_SECRET=<random-secret>
```

**Optional — Email (job alerts + password-reset OTP):**

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
SMTP_FROM="MicroDegree <noreply@microdegree.work>"
EMAIL_SUBSCRIPTION_SECRET=<random-secret>
```

**Optional — AI HR comments:**

```bash
CLAUDE_API_KEY=<anthropic-key>
CLAUDE_MODEL=claude-sonnet-4-6
AI_MIN_EXTRACTION_HARD=0.6
AI_MIN_EXTRACTION_SOFT=0.4
```

**Optional — Zoom:**

```bash
ZOOM_ACCOUNT_ID=<account-id>
ZOOM_CLIENT_ID=<client-id>
ZOOM_CLIENT_SECRET=<client-secret>
ZOOM_AUTH_URL=https://zoom.us/oauth/token
ZOOM_BASE_URL=https://api.zoom.us/v2
ZOOM_MEETING_ID=<recurring-meeting-id>
ZOOM_TOKEN_CACHE_TTL=3300
DISABLE_ZOOM_EMAIL=false
```

---

## Local Setup

```bash
# 1) clone and install
git clone <this-repo>
cd MicroDegreeHiringPortal

# 2) backend
cd backend
npm install
cp .env.example .env       # if present; otherwise create .env from the keys above
npm run dev                # nodemon → http://localhost:5000

# 3) frontend (in a second terminal)
cd ../frontend
npm install
cp .env.example .env       # if present; otherwise create .env
npm run dev                # vite → http://localhost:5173
```

Open `http://localhost:5173/home` for the public landing page, or `/login` to sign in.

---

## Database Migrations

The repo tracks schema as ordered SQL files under [backend/sql/migrations/](backend/sql/migrations/). Apply them in filename order against your Supabase Postgres before expecting full feature parity. Examples of the files you'll find there:

- `2026-03-21-add-cloud-drive-and-registrations.sql`
- `2026-03-17-add-application-pipeline-fields.sql`
- `2026-04-03-add-cloud-drive-status-fields-to-profiles.sql`
- `2026-04-21-career-readiness-engine-core.sql`

There is no migration runner in the repo — paste each file into the Supabase SQL editor (or run via `psql`) in order. Several flows depend on `SUPABASE_SERVICE_ROLE_KEY`; without it admin and public-tracking endpoints degrade.

---

## Available Scripts

**Backend** (`backend/package.json`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the API with `nodemon src/server.js` |
| `npm start` | Starts the API with `node src/server.js` |

**Frontend** (`frontend/package.json`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build to `frontend/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the frontend |

---

## Key Features

- **Role-based portals** for `STUDENT`, `ADMIN` (HR), and `SUPER_ADMIN`, all on a single React SPA.
- **Career readiness engine** — premium opportunities unlock only when profile is complete, at least one resume is HR-approved, the student has cleared a cloud drive, and no blocking internal flags (`ON_HOLD`, `BLACKLISTED`, etc.) are set.
- **Eligibility + quota model** — students mapped to `students_enrolled_all` with `course_fee >= 7000` get a 2-year window; outside that, an atomically decremented `application_quota` still allows targeted apply.
- **Premium vs Practice jobs** — students without readiness/quota only see `PRACTICE_OPPORTUNITY` jobs.
- **JD posting with custom screening questions**, broadcast notifications, and SMTP email alerts to readiness-eligible subscribers.
- **Application pipeline** — status / stage / sub-stage normalization, HR comment history with Claude-powered AI suggestion hookup, audit events.
- **Resume management** — upload to Supabase Storage `resumes` bucket, active-resume selection, HR approval/rejection; deletes are blocked if any application still references the resume URL.
- **Cloud Drive workflow** — students register for upcoming drives; HR sets `MCQ Screening Test cleared` / `MCQ Screening Test Rejected` / Practical / Face-to-Face / Managerial / Cleared statuses; `cloud_drive_status_history` and `drive_cleared_status` on `profiles` stay in sync.
- **External jobs** — admin-posted feed with public sharing (`ref`, `utm_*`, share channel, visitor token) and a Super Admin analytics view; bulk import via Excel/CSV with a downloadable [JobTemplate.xlsx](frontend/public/JobTemplate.xlsx).
- **Daily interview-prep sessions** — Zoom Server-to-Server registrant flow, with token caching and duplicate-registrant recovery.
- **Student-driven referrals** + an HR follow-up view.
- **Auth** — email/password with cookie-based sessions, Google OAuth via Supabase PKCE, OTP-based password reset over email.
- **Super Admin** — manage HR admins, students, favourites/playlists, jobs, applications, checker tools, and analytics dashboards (visit, click, share, resume builder).

---

## Public Landing Page (`/home`)

[frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx) is the marketing surface for unauthenticated visitors.

- **Routing** — root `/` uses `HomeRedirect`: signed-out users go to `/home`; signed-in users are redirected to their role dashboard.
- **Sections** — sticky logo nav (hash links + mobile drawer), hero with a sample readiness dashboard visual, stats strip, features grid, 3-step "How It Works" journey, a **Live Openings** rail that fetches the top 3 active external jobs via `listPublicActiveExternalJobs` (with skeleton, empty, and error states), a Readiness Engine highlight, a disabled proof/career-paths section (flip the `if (false &&)` flag to re-enable), and a final CTA.
- **Motion** — Framer Motion 12 drives `FadeIn`, `StaggerGroup`, `StaggerItem`, plus a backwards-compatible `Reveal` alias. Above-the-fold hero animates on mount; everything else on scroll.
- **Logo asset** — loads `/MicroDegree Pink.5777a8ffd9ff3026b011.png` with a fallback chain to `/Logo.png` and then a remote MicroDegree URL.
- **CTA routing** — "View All Jobs" routes to `/student/external-jobs` for signed-in users and `/login` otherwise.

---

## Deployment

- **Frontend** is built with `npm run build` and deployed to Netlify. The Netlify config rewrites `/api/*` to the DigitalOcean backend so authentication cookies stay first-party.
- **Backend** runs on DigitalOcean (`npm start`); CORS is driven by `FRONTEND_ORIGIN` / `FRONTEND_ORIGINS` and `BACKEND_ORIGIN`.
- **Supabase** hosts the database, auth, and the `resumes` storage bucket.
- Job auto-close (after `valid_till`) and 30-day soft-delete of closed jobs are **opportunistic on read**, not driven by a scheduled worker — so traffic alone keeps the feed clean.

---

## Troubleshooting

- **`/api/*` returns 404 in production but works locally.** The Netlify rewrite to the DO backend isn't applied — check `netlify.toml` / `_redirects`.
- **Admin / public-tracking endpoints silently degrade.** `SUPABASE_SERVICE_ROLE_KEY` is missing on the backend — many service functions fall back to anon-only behavior.
- **Daily session join URL never appears.** Confirm `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and `ZOOM_MEETING_ID` are set; the access token is cached in-memory, so a backend restart will re-fetch.
- **Premium jobs not unlocking.** Walk through the readiness engine: profile completion, resume approval, cloud-drive clearance, and that `internal_flags` does not contain a blocking value.
- **Auth loops on Netlify.** `VITE_API_BASE_URL` should resolve to same-origin `/api` on the deployed domain so cookies remain first-party.

---

## License

Proprietary — internal MicroDegree project. Not for redistribution.
