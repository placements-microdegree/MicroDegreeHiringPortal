# MicroDegree Hiring Portal Blueprint

## 1. Project Overview
- **Project name:** MicroDegree Hiring / Placement Portal
- **Purpose:** role-based platform for student placement readiness, premium/practice job access, HR-driven application management, and superadmin analytics/operations.
- **Core functionality:** auth, profile completion, eligibility/readiness gating, job posting, applications, resume handling, cloud drive workflow, external jobs, daily sessions, referrals, notifications, favourites/playlists, analytics.
- **Target users (Students):** manage profile/resume, track readiness, apply to jobs, join sessions, register for cloud drive, refer jobs.
- **Target users (Admins / HR):** post JDs, manage student applications, edit student internal status, run cloud drive/session workflows.
- **Target users (Super Admins):** oversee platform health, manage HR admins, curate students, inspect analytics, run checker tools.

## 2. Tech Stack
- **Frontend:** React 19, React Router 7, Vite 7, Tailwind CSS 4, Framer Motion 12, React Icons, React Toastify, SweetAlert2, Recharts, XLSX, jsPDF.
- **Backend:** Node.js, Express 5, CommonJS modules, Multer, Nodemailer, pdf-parse.
- **Database / auth / storage:** Supabase Postgres + Auth + Storage (`resumes` bucket).
- **Integrations:** Google OAuth via Supabase PKCE flow.
- **Integrations:** Anthropic Claude for AI HR comment suggestions.
- **Integrations:** Zoom account-credentials API for daily session registration/join links.
- **Integrations:** SMTP email for job alerts + password reset OTP.
- **Dev / deploy:** Nodemon, Vite dev server, Netlify SPA hosting with `/api/*` proxy to backend, optional Vercel rewrite.

## 3. Architecture Summary
- **Shape:** single React SPA + single Express API + Supabase backend services.
- **Backend style:** route -> controller -> service -> Supabase query; no ORM/models layer.
- **Frontend style:** route/page-driven UI with domain-specific `services/*` wrappers; auth handled by context, not Redux.
- **Auth model:** backend sets `mdpp_access_token` and `mdpp_refresh_token` cookies; middleware also accepts Bearer tokens and can restore session from refresh token.
- **High-level flow:** UI action -> frontend service `fetch` -> Express endpoint -> business service -> Supabase/Auth/Storage -> normalized JSON -> page/component state refresh.
- **Cross-cutting patterns:** role guards on both frontend and backend.
- **Cross-cutting patterns:** cached read endpoints with explicit invalidation.
- **Cross-cutting patterns:** broadcast notifications plus per-user read receipts.
- **Cross-cutting patterns:** central career-readiness engine reused by jobs, applications, and email-subscription gating.
- **Cross-cutting patterns:** analytics computed from DB aggregates/event tables, not a separate analytics service.

## 4. Folder & File Structure
- `frontend/src/routes/AppRoutes.jsx`: full route map and role segmentation.
- `frontend/src/context/AuthContext.jsx`: loads session/profile, exposes login/signup/logout/profile mutation helpers.
- `frontend/src/services/*`: API layer grouped by domain (`auth`, `job`, `application`, `admin`, `externalJob`, `cloudDrive`, `dailySession`, etc.).
- `frontend/src/components/layout/*`: dashboard shell (`DashboardLayout`, `Sidebar`, `Navbar`, `NotificationBell`, `ProfileDrawer`).
- `frontend/src/components/student/*`: student job/apply/profile helpers.
- `frontend/src/components/admin/*`: HR tables, JD form, student profile modal, application management views.
- `frontend/src/pages/student/*`: student dashboard, jobs, application status, external jobs, daily sessions, cloud drive, referrals, help/guide.
- `frontend/src/pages/admin/*`: admin dashboard, post JD, manage applications, cloud drive admin, daily session setting, external jobs, referred data, placement pipeline.
- `frontend/src/pages/superadmin/*`: analytics dashboard, HR admin management, students, favourites, playlists, checker, analytics pages.
- `backend/src/app.js`: Express app assembly, CORS, cookies, route mounting.
- `backend/src/routes/*`: endpoint registry by domain.
- `backend/src/controllers/*`: thin HTTP adapters.
- `backend/src/services/*`: real business logic and data access.
- `backend/sql/migrations/*`: schema history; important for table/trigger/analytics understanding.
- `backend/data/dailySessions.settings.json`: legacy/default daily-session settings file.

## 5. Frontend Breakdown
- **State management:** global auth/profile state lives in `AuthProvider`.
- **State management:** everything else uses local component/page state.
- **State management:** no Redux/Zustand; service calls are direct.
- **Route groups (Public):** `/home` (public landing page), `/login`, `/signup`, `/forgot-password`, `/jobs` (public external jobs), `/email-subscription`.
- **Public landing page (`/home`, `frontend/src/pages/Home.jsx`):** marketing surface for unauthenticated visitors; root path `/` uses `HomeRedirect`, which sends signed-out users to `/home` and signed-in users to their role dashboard (`/student/dashboard`, `/admin/dashboard`, or `/superadmin/dashboard`).
- **Public landing page sections:** sticky logo nav with hash links and a mobile drawer; hero with a sample readiness dashboard visual; stats strip (`PROOF_POINTS`); features grid (`STUDENT_FEATURES`); 3-step "How It Works" journey; a live "Recent jobs" rail that fetches the top 3 active external jobs via `listPublicActiveExternalJobs` (with skeleton, empty, and error states); a Readiness Engine highlight; a disabled proof/career-paths section gated by an `if (false &&)` flag; final CTA; shared `Footer`.
- **Public landing page motion / assets:** Framer Motion drives reusable `FadeIn`, `StaggerGroup`, `StaggerItem`, and a backwards-compatible `Reveal` alias (delay accepts ms or seconds); above-the-fold hero animates on mount, the rest on scroll. The nav logo loads `/MicroDegree Pink.5777a8ffd9ff3026b011.png` with a fallback chain to `/Logo.png` and then a remote MicroDegree URL.
- **Public landing page CTAs:** "View All Jobs" routes to `/student/external-jobs` for signed-in users and `/login` otherwise (via `useAuth`); the logo click smooth-scrolls to top respecting `prefers-reduced-motion`.
- **Route groups (Student):** `/student/dashboard`, `/student/jobs`, `/student/external-jobs`, `/student/daily-sessions`, `/student/applications`, `/student/cloud-drive`, referral pages, guide/help.
- **Route groups (Admin):** dashboard, post JD, manage applications, students, favourites, playlists, cloud drive admin, daily session setting, external jobs, referred data, placement pipeline pages.
- **Route groups (Super admin):** dashboard, manage HR admins, students, favourites/playlists, jobs, applications, checker, external-job analytics, visit analytics, resume-builder analytics.
- **Route guards:** `ProtectedRoute` checks auth + role.
- **Route guards:** incomplete students are forced to `/complete-profile`.
- **Key components:** `ProfileDrawer` handles student self-service profile, photo, and resume management.
- **Key components:** `ApplyJobModal` is the core application form with resume selection/upload, custom answers, and save-for-future profile updates.
- **Key components:** `ManageApplicationsByJobView` plus `ApplicationsTable` drive the main HR workflow UI.
- **Key components:** `StudentProfileModal` lets admins/superadmins edit cloud-drive history, internal flags, notes, resume approvals, and job-search status.
- **API interaction layer:** `resolveApiBaseUrl()` uses same-origin `/api` on deployed `microdegree.work`/Netlify domains so cookies stay first-party.
- **Notable UX behavior:** student dashboard shows readiness status, recent jobs/apps, and a public career-progress board.
- **Notable UX behavior:** Application Status combines milestone tracking with application timeline/comments.
- **Notable UX behavior:** External Jobs supports public sharing with `ref`, `utm_*`, share channel, and visitor-token tracking.
- **Notable UX behavior:** Resume Builder tracks clicks and forwards Supabase session tokens to `https://resumes.microdegree.work`.

## 6. Backend Breakdown
- **API modules:** `authRoutes` handles signup, login, logout, Google OAuth, OTP password reset, `/me`, and `/session`.
- **API modules:** `profileRoutes` handles self profile CRUD, photo upload, email-subscription updates, and token-based email-subscription page support.
- **API modules:** `jobRoutes`, `applicationRoutes`, `resumeRoutes`, `adminRoutes`, `notificationRoutes`, `externalJobRoutes`, `cloudDriveRoutes`, `referralRoutes`, `resumeBuilderRoutes`, `dailySessionRoutes`, and `joinSessionRoutes` cover the remaining domains.
- **Key services:** `careerReadinessService` derives placement readiness from profile completeness, cloud-drive clearance, approved resume, and blocking flags.
- **Key services:** `applicationService` owns application creation/update, status normalization, quota handling, apply-on-behalf, comment history, AI suggestion hookup, and student analytics.
- **Key services:** `jobService` owns JD validation, custom question persistence, auto-close/soft-delete of jobs, and notification/email fanout.
- **Key services:** `adminService` owns student aggregation, favourites/playlists, internal profile editing, analytics, checker, and admin promotion.
- **Key services:** `externalJobService`, `cloudDriveService`, `joinSessionService`, `emailService`, and `emailSubscriptionService` implement the external-job, cloud-drive, Zoom-session, and email workflows.
- **Auth / middleware:** `verifyToken` reads cookie/Bearer auth, refreshes if possible, and attaches `req.user`.
- **Auth / middleware:** `optionalVerifyToken` allows public-or-authenticated requests.
- **Auth / middleware:** `authorizeRole` lets `SUPER_ADMIN` bypass narrower role checks.
- **Auth / middleware:** `apiCache` provides simple response caching with path-prefix invalidation.
- **Main tables / entities:** core tables are `profiles`, `jobs`, `job_questions`, `applications`, `application_answers`, and `resumes`.
- **Main tables / entities:** support tables include `students_enrolled_all`, `otp_codes`, `profile_internal_notes`, `profile_status_history`, `notifications`, and `notification_reads`.
- **Main tables / entities:** feature/event tables include `external_jobs`, `external_jobs_page_visits`, `external_job_apply_clicks`, `external_job_growth_events`, `cloud_drives`, `cloud_drive_registrations`, `student_job_referrals`, `resume_builder_clicks`, `application_comment_history`, `ai_comment_suggestions`, `ai_comment_audit_events`, `user_daily_activity`, and the `superadmin_favorite_*` tables.

## 7. Data Flow Explanation
- **Login / signup flow:** student/admin signs up or logs in -> backend creates/ensures `profiles` row -> for students, backend matches `students_enrolled_all` and computes eligibility/quota window -> auth cookies set -> frontend loads `/api/auth/me` then `/api/profile/me`.
- **Job posting flow:** admin submits JD -> backend validates fields and custom questions -> inserts `jobs` plus `job_questions` -> creates broadcast notification -> sends premium job emails to subscribed readiness-eligible students.
- **Student apply flow:** student opens premium/practice job -> `ApplyJobModal` collects resume, answers, and optional profile updates -> backend checks duplicate, selected resume, JD confirmation, job type, readiness/quota -> inserts `applications` plus `application_answers` -> decrements quota when applicable -> dashboard/application pages refresh.
- **Admin pipeline flow:** admin loads all applications -> filtering/grouping happen in UI -> admin updates status/comment or gets AI suggestion -> backend normalizes pipeline fields and writes comment history/audit events -> student sees updated status/comment.
- **Cloud drive flow:** student registers for upcoming drive -> row added in `cloud_drive_registrations` -> admin updates registration status -> profile `cloud_drive_status`, `drive_cleared_status`, `drive_cleared_date`, and history are synced -> readiness engine may unlock opportunities.
- **Daily session flow:** student/admin lists active sessions -> join request hits backend -> Zoom registrant created or reused -> response returns join URL or "registered but too early" state -> frontend stores temporary registration state.
- **External jobs flow:** student/public visitor opens feed -> visit event logged -> click/share events tracked with referral metadata -> superadmin views visit/click/share analytics.

## 8. Key Features
- Role-based dashboards for `STUDENT`, `ADMIN`, `SUPER_ADMIN`.
- Student eligibility + career-readiness gating for real opportunities.
- Premium jobs vs practice opportunities.
- JD posting with custom screening questions.
- Full application pipeline with status, stage, sub-stage, HR comments, history.
- Resume upload, active resume selection, HR approval/rejection.
- Cloud Drive registration and clearance workflow.
- External job feed with public sharing and growth analytics.
- Daily interview-prep sessions with Zoom registration.
- Student job referrals + admin follow-up view.
- Broadcast notifications and premium job email alerts.
- Favourite students + playlist curation for admins/superadmins.
- Superadmin analytics dashboard + checker page.
- Password reset via OTP email + Google OAuth login.

## 9. Important Logic / Algorithms
- **Student eligibility:** student must map to `students_enrolled_all`, have `course_fee >= 7000`, and still be inside a 2-year window from profile creation; otherwise they become ineligible but may still keep a quota.
- **Career readiness:** real opportunities unlock only when cloud drive is cleared, required profile fields are complete, at least one resume is approved, and internal flags do not contain blocking values like `ON_HOLD` / `BLACKLISTED`.
- **Legacy/quota access:** a student can still access opportunities if they are inside the legacy eligibility window or have remaining `application_quota`; non-eligible quota is decremented atomically on apply and restored if insert fails.
- **Job visibility pruning:** expired active jobs auto-close on reads; closed jobs auto-soft-delete after 30 days; students without readiness/quota only see `PRACTICE_OPPORTUNITY`.
- **Pipeline normalization:** multiple historical status labels are mapped into canonical `status` / `stage` / `sub_stage` values so UI and DB constraints stay consistent.
- **Resume safety:** deleting a resume does not remove the storage object if any existing application references that resume URL.
- **External-job attribution:** visits/clicks/shares capture ref-student, UTM fields, share channel, visitor token, and landing path for lightweight viral analytics.
- **Zoom registration recovery:** access token is cached; duplicate registrants are detected and existing join URLs are recovered instead of failing.

## 10. Environment & Setup
- **Frontend env:** `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Backend core env:** `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN` or `FRONTEND_ORIGINS`, `BACKEND_ORIGIN`, `NODE_ENV`, `API_CACHE_TTL_SECONDS`
- **Optional backend env (OTP):** `OTP_HASH_SECRET`
- **Optional backend env (Email):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_SUBSCRIPTION_SECRET`
- **Optional backend env (AI comments):** `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `AI_MIN_EXTRACTION_HARD`, `AI_MIN_EXTRACTION_SOFT`
- **Optional backend env (Zoom):** `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_AUTH_URL`, `ZOOM_BASE_URL`, `ZOOM_MEETING_ID`, `ZOOM_TOKEN_CACHE_TTL`, `DISABLE_ZOOM_EMAIL`
- **Run locally:** `cd backend && npm i && npm run dev`
- **Run locally:** `cd frontend && npm i && npm run dev`
- **Run locally:** apply Supabase migrations in `backend/sql/migrations` before expecting full feature parity.
- **Deployment note:** Netlify rewrites `/api/*` to the DigitalOcean backend so browser auth cookies remain first-party.

## 11. Known Limitations / Assumptions
- Backend README is partially outdated; current app uses cookie-based auth heavily, not just Bearer-token flows.
- Many advanced flows assume `SUPABASE_SERVICE_ROLE_KEY` exists; without it, admin/public tracking and some storage behavior degrade.
- No dedicated automated test suite is visible in the repo; behavior appears largely validated through runtime/manual flows.
- Job expiry cleanup is opportunistic on read, not driven by a scheduler/worker.
- Some admin analytics fall back to overall data when older records lack ownership mapping.
- Daily-session routes are built for students/admins; superadmin is not a first-class session participant.
- Frontend admin/student-filter logic is duplicated across `Students`, `Favourites`, and `Playlists`.
- Several external URLs are hard-coded (`practice.microdegree.work`, `resumes.microdegree.work`, public MicroDegree links).

## 12. Quick Mental Model
- Think of the project as **three portals on one codebase**.
- **Student portal mental model:** readiness -> jobs -> applications -> support tools.
- **HR portal mental model:** post jobs -> manage pipeline -> update student internal state.
- **Superadmin portal mental model:** govern people/data -> curate students -> inspect analytics.
- **Core state machine:** `profile -> eligibility -> career readiness -> visible opportunities -> applications -> analytics`
- Supabase is the system of record; Express mostly exists to enforce business rules around that state machine.
