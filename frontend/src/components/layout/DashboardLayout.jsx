import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import Navbar from "./Navbar";
import ProfileDrawer from "./ProfileDrawer";
import Sidebar from "./Sidebar";
import JobCard from "../../components/student/JobCard";
import ApplyJobModal from "../../components/student/ApplyJobModal";
import Loader from "../../components/common/Loader";
import { listApplicationsByStudent } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { showError, showInfo } from "../../utils/alerts";
import { ROLES } from "../../utils/constants";
import { calculateProfileCompletion } from "../../utils/calculateProfileCompletion";
import {
  FiBriefcase,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiFileText,
  FiStar,
  FiCalendar,
  FiAward,
} from "react-icons/fi";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateInput) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

const STATUS_META = {
  Applied: {
    label: "Applied",
    Icon: FiClock,
    cls: "bg-amber-50   text-amber-700   border-amber-200",
  },
  Reviewed: {
    label: "Reviewed",
    Icon: FiAlertCircle,
    cls: "bg-blue-50    text-blue-700    border-blue-200",
  },
  Accepted: {
    label: "Accepted",
    Icon: FiCheckCircle,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  Rejected: {
    label: "Rejected",
    Icon: FiXCircle,
    cls: "bg-red-50     text-red-700     border-red-200",
  },
  Shortlisted: {
    label: "Shortlisted",
    Icon: FiStar,
    cls: "bg-purple-50  text-purple-700  border-purple-200",
  },
  Interview: {
    label: "Interview Scheduled",
    Icon: FiCalendar,
    cls: "bg-indigo-50  text-indigo-700  border-indigo-200",
  },
  Selected: {
    label: "Selected",
    Icon: FiAward,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "Resume Screening Rejected": {
    label: "Resume Screening Rejected",
    Icon: FiXCircle,
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  "Profile Mapped for client": {
    label: "Profile Mapped for client",
    Icon: FiAlertCircle,
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  "Client Rejected": {
    label: "Client Rejected",
    Icon: FiXCircle,
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function normalizeApplicationStatus(status) {
  const value = String(status || "").trim();
  if (!value) return "Applied";

  if (value === "ResumeScreeningRejected") return "Resume Screening Rejected";
  if (value.toLowerCase() === "reviewed") return "Reviewed";
  if (value.toLowerCase() === "accepted") return "Accepted";
  if (value.toLowerCase() === "rejected") return "Rejected";
  if (value.toLowerCase() === "shortlisted") return "Shortlisted";
  if (value.toLowerCase() === "interview") return "Interview";
  if (value.toLowerCase() === "selected") return "Selected";

  return value;
}

// ── StatsBar ──────────────────────────────────────────────────────────────────

function StatsBar({ jobs, apps }) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeApps = Array.isArray(apps) ? apps : [];
  const statuses = safeApps.map((a) => (a?.status || "Applied").toLowerCase());

  const stats = [
    {
      label: "Total Jobs Available",
      value: safeJobs.length,
      icon: FiBriefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Applications Submitted",
      value: safeApps.length,
      icon: FiFileText,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Shortlisted",
      value: statuses.filter((s) => s === "shortlisted").length,
      icon: FiStar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Interview Scheduled",
      value: statuses.filter((s) => s === "interview").length,
      icon: FiCalendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Selected",
      value: statuses.filter((s) => s === "selected" || s === "accepted")
        .length,
      icon: FiAward,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((item) => {
        const StatIcon = item.icon;
        return (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}
            >
              <StatIcon className={`h-5 w-5 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="mt-0.5 text-center text-xs text-slate-500">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── ApplicationCard ───────────────────────────────────────────────────────────

function ApplicationCard({ application, jobs }) {
  const jobId = String(application?.job_id || application?.jobId || "");
  const job = jobs.find((j) => String(j.id) === jobId);
  const status = normalizeApplicationStatus(application?.status);
  const meta = STATUS_META[status] || STATUS_META.Applied;
  const { Icon } = meta;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {job?.title || "Job Title Unavailable"}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {job?.company || "Company Unavailable"}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.cls}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Applied <on></on>
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">
            {formatDate(application?.created_at || application?.createdAt)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Location
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
            {job?.location || "—"}
          </p>
        </div>
      </div>

      {job?.ctc && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            CTC
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            {job.ctc}
          </p>
        </div>
      )}
    </article>
  );
}

// ── StudentDashboardHome ──────────────────────────────────────────────────────

function StudentDashboardHome({ profile }) {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [jobRows, appRows] = await Promise.all([
        listJobs(),
        listApplicationsByStudent(),
      ]);
      setJobs(Array.isArray(jobRows) ? jobRows : []);
      setApps(Array.isArray(appRows) ? appRows : []);
    } catch (error) {
      setJobs([]);
      setApps([]);
      await showError(error?.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const appliedJobIds = useMemo(
    () =>
      new Set(
        (Array.isArray(apps) ? apps : []).map((a) =>
          String(a?.job_id || a?.jobId || ""),
        ),
      ),
    [apps],
  );

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeApps = Array.isArray(apps) ? apps : [];
  const previewJobs = safeJobs.slice(0, 3);
  const previewApps = safeApps.slice(0, 3);

  const apply = async (job) => {
    const hasEligibilityWindow = profile?.isEligible === true;
    const remainingQuota = Number(profile?.applicationQuota ?? 0);
    const hasQuotaAccess = !hasEligibilityWindow && remainingQuota > 0;

    if (!hasEligibilityWindow && !hasQuotaAccess) {
      await showInfo(
        "You are not eligible to apply and your application quota is exhausted.",
        "Not Eligible",
      );
      return;
    }
    if (appliedJobIds.has(String(job?.id))) {
      await showInfo("You already applied for this job.", "Already Applied");
      return;
    }
    setSelectedJob(job);
    setApplyOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Welcome back, {profile?.fullName?.split(" ")[0] || "Student"} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's a snapshot of open roles and your recent activity.
        </p>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <Loader label="Loading dashboard..." />
        </div>
      ) : (
        <>
          {/* Stats */}
          <StatsBar jobs={safeJobs} apps={safeApps} />

          {/* Open Jobs */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Open Jobs
                </h2>
                <p className="text-sm text-slate-500">
                  Latest opportunities for you
                </p>
              </div>
              {safeJobs.length > 3 && (
                <button
                  onClick={() => navigate("/student/jobs")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  View All ({safeJobs.length})
                </button>
              )}
            </div>

            {previewJobs.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                No jobs posted at the moment
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {previewJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApply={apply}
                    applied={appliedJobIds.has(String(job?.id))}
                  />
                ))}
              </div>
            )}

            {safeJobs.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate("/student/jobs")}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <FiBriefcase className="h-4 w-4" />
                  View More Jobs
                </button>
              </div>
            )}
          </section>

          {/* Recent Applications */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Applications
                </h2>
                <p className="text-sm text-slate-500">
                  Track your latest submissions
                </p>
              </div>
              {safeApps.length > 3 && (
                <button
                  onClick={() => navigate("/student/applications")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  View All ({safeApps.length})
                </button>
              )}
            </div>

            {previewApps.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                You haven't applied to any jobs yet
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {previewApps.map((app) => (
                  <ApplicationCard
                    key={app.id || app.application_id}
                    application={app}
                    jobs={safeJobs}
                  />
                ))}
              </div>
            )}

            {safeApps.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate("/student/applications")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  View More Applications
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <ApplyJobModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={selectedJob}
        profile={profile}
        onApplied={refresh}
      />
    </div>
  );
}

// ── DashboardLayout ───────────────────────────────────────────────────────────

export default function DashboardLayout({ role }) {
  const { profile, updateProfile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isStudent = role === ROLES.STUDENT;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const title = useMemo(() => {
    if (role === ROLES.SUPER_ADMIN) {
      if (location.pathname.includes("manage-hr")) return "Manage HR Admins";
      if (location.pathname.includes("students")) return "Students";
      if (location.pathname.includes("jobs")) return "Jobs";
      if (location.pathname.includes("applications")) return "Applications";
      return "Super Admin Dashboard";
    }
    if (role === ROLES.ADMIN) {
      if (location.pathname.includes("post-jd")) return "Post JD";
      if (location.pathname.includes("manage-applications"))
        return "Manage Applications";
      return "Admin Dashboard";
    }
    if (location.pathname.includes("/student/jobs")) return "Jobs (JD)";
    if (location.pathname.includes("/student/applications"))
      return "Application Status";
    if (location.pathname.includes("/student/help")) return "Help Center";
    return "Student Dashboard";
  }, [location.pathname, role]);

  const showProfile = role === ROLES.STUDENT;

  const completionPercent = useMemo(() => {
    if (!showProfile) return null;
    return calculateProfileCompletion(profile);
  }, [profile, showProfile]);

  // Render StudentDashboardHome on the student root route
  const isStudentHome =
    isStudent &&
    (location.pathname === "/student" ||
      location.pathname === "/student/" ||
      location.pathname.endsWith("/student/dashboard"));

  return (
    <div className="min-h-screen bg-bgLight">
      <div className="flex">
        {/* Sidebar — sticky behaviour handled inside Sidebar.jsx */}
        <Sidebar
          role={role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onProfileClick={isStudent ? () => setDrawerOpen(true) : undefined}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          {/* Navbar — fully unchanged except two new eligibility props */}
          <Navbar
            title={title}
            profilePhotoUrl={profile?.profilePhotoUrl || ""}
            studentName={profile?.fullName || "Student"}
            onProfileClick={() => setDrawerOpen(true)}
            onMenuClick={() => setSidebarOpen((prev) => !prev)}
            showProfile={showProfile}
            completionPercent={completionPercent}
            isEligible={profile?.isEligible}
            applicationQuota={profile?.applicationQuota}
          />

          <main
            className={`flex-1 ${isStudent ? "bg-slate-50 p-6 lg:p-7" : "p-6"}`}
          >
            {isStudentHome ? (
              <StudentDashboardHome profile={profile} />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      {showProfile ? (
        <ProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          profile={profile}
          onSave={updateProfile}
        />
      ) : null}
    </div>
  );
}
