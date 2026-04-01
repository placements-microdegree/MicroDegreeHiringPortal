import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import Navbar from "./Navbar";
import ProfileDrawer from "./ProfileDrawer";
import Sidebar from "./Sidebar";
import JobCard from "../../components/student/JobCard";
import ApplyJobModal from "../../components/student/ApplyJobModal";
import Loader from "../../components/common/Loader";
import {
  listApplicationsByStudent,
  listCareerProgressBoard,
} from "../../services/applicationService";
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
  "Resume Not Matched": {
    label: "Resume Not Matched",
    Icon: FiXCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  "Mapped to Client": {
    label: "Mapped to Client",
    Icon: FiAlertCircle,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "Screening call Received": {
    label: "Screening call Received",
    Icon: FiAlertCircle,
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  "screening Discolified": {
    label: "screening Discolified",
    Icon: FiXCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  Interview: {
    label: "Interview scheduled",
    Icon: FiCalendar,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "Interview scheduled": {
    label: "Interview scheduled",
    Icon: FiCalendar,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "Interview Not Cleared": {
    label: "Interview Not Cleared",
    Icon: FiXCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  "Technical Round": {
    label: "Technical Round",
    Icon: FiAlertCircle,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "final Round": {
    label: "final Round",
    Icon: FiAward,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Selected: {
    label: "Selected",
    Icon: FiAward,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  Placed: {
    label: "Placed",
    Icon: FiCheckCircle,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "Job on hold": {
    label: "Job on hold",
    Icon: FiXCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  "Position closed": {
    label: "Position closed",
    Icon: FiXCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
};

function normalizeApplicationStatus(status) {
  const value = String(status || "").trim();
  if (!value) return "Applied";

  const aliases = {
    ResumeScreeningRejected: "Resume Not Matched",
    Shortlisted: "Screening call Received",
    "Resume Screening Rejected": "Resume Not Matched",
    "Profile Mapped for client": "Mapped to Client",
    "Interview Scheduled": "Interview scheduled",
    Interview: "Interview scheduled",
    "Final Round": "final Round",
    "Client Rejected": "screening Discolified",
    Rejected: "screening Discolified",
    "Position Closed": "Position closed",
    "Job on hold/ position closed": "Position closed",
    Selected: "Placed",
  };

  if (aliases[value]) return aliases[value];

  const lowered = value.toLowerCase();
  if (lowered === "screening call received") return "Screening call Received";
  if (lowered === "resume not matched") return "Resume Not Matched";
  if (lowered === "mapped to client") return "Mapped to Client";
  if (lowered === "screeing discolified") return "screening Discolified";
  if (lowered === "screening discolified") return "screening Discolified";
  if (lowered === "interview scheduled") return "Interview scheduled";
  if (lowered === "interview not cleared") return "Interview Not Cleared";
  if (lowered === "technical round") return "Technical Round";
  if (lowered === "final round") return "final Round";
  if (lowered === "placed") return "Placed";
  if (lowered === "job on hold") return "Job on hold";
  if (lowered === "position closed") return "Position closed";
  if (lowered === "job on hold/ position closed") return "Position closed";

  return value;
}

function maskStudentName(name) {
  const safeName = String(name || "").trim();
  if (!safeName) return "Student ***";
  const firstWord = safeName.split(/\s+/)[0] || "Student";
  return `${firstWord} ***`;
}

// ── StatsBar ──────────────────────────────────────────────────────────────────

function StatsBar({ jobs, apps }) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeApps = Array.isArray(apps) ? apps : [];
  const statuses = safeApps.map((a) =>
    (a?.sub_stage || a?.status || "Applied").toLowerCase(),
  );
  const activeJobsCount = safeJobs.filter(
    (job) =>
      String(job?.status || "")
        .trim()
        .toLowerCase() === "active",
  ).length;

  const stats = [
    {
      label: "Total Jobs Available",
      value: activeJobsCount,
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
      label: "Mapped to Client",
      value: statuses.filter((s) => s === "mapped to client").length,
      icon: FiStar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Interview scheduled",
      value: statuses.filter((s) => s === "interview scheduled").length,
      icon: FiCalendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Placed",
      value: statuses.filter((s) => s === "placed" || s === "selected").length,
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
  const status = normalizeApplicationStatus(
    application?.sub_stage || application?.status,
  );
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
  const [careerProgressBoard, setCareerProgressBoard] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [jobRows, appRows, progressRows] = await Promise.all([
        listJobs({ includeClosed: true }),
        listApplicationsByStudent(),
        listCareerProgressBoard(),
      ]);
      setJobs(Array.isArray(jobRows) ? jobRows : []);
      setApps(Array.isArray(appRows) ? appRows : []);
      setCareerProgressBoard(Array.isArray(progressRows) ? progressRows : []);
    } catch (error) {
      setJobs([]);
      setApps([]);
      setCareerProgressBoard([]);
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

          {/* Recent Jobs */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Jobs
                </h2>
                <p className="text-sm text-slate-500">
                  Latest opportunities for you (closed jobs cannot be applied)
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
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Job Title</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">
                          Applied Date
                        </th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewApps.map((app) => {
                        const status = normalizeApplicationStatus(
                          app?.sub_stage || app?.status,
                        );
                        const meta = STATUS_META[status] || STATUS_META.Applied;
                        return (
                          <tr
                            key={app.id || app.application_id}
                            className="border-t border-slate-200"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {app?.jobs?.title || app?.jobTitle || "Job"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {app?.jobs?.company || app?.company || "Company"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatDate(app?.created_at || app?.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.cls}`}
                              >
                                {meta.label || status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

          {/* Career Progress Board */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Our Students • Career Progress Board
                </h2>
                <p className="text-sm text-slate-500">
                  Interview and placement progress of MicroDegree students.
                </p>
              </div>
              {/* <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Live Career Updates
              </span> */}
            </div>

            {careerProgressBoard.length === 0 ? (
              <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 text-sm text-slate-500">
                No student progress updates available right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {careerProgressBoard.map((company) => (
                  <article
                    key={`${company.companyName}-${company.jobTitle || "Job Role"}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {company.companyName}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Role: {company.jobTitle || "Job Role"}
                          </p>
                        </div>
                        <span className="rounded-full border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          {Array.isArray(company.students)
                            ? company.students.length
                            : 0}{" "}
                          {Array.isArray(company.students) &&
                          company.students.length === 1
                            ? "Student"
                            : "Students"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 p-4">
                      {(Array.isArray(company.students)
                        ? company.students
                        : []
                      ).map((student, index) => {
                        const statusMeta =
                          STATUS_META[student.recruitmentPhase];
                        return (
                          <div
                            key={`${company.companyName}-${student.studentName}-${student.recruitmentPhase}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
                          >
                            <span
                              className="inline-flex rounded-lg border px-2.5 py-1 text-sm font-semibold"
                              style={{
                                backgroundColor: "#FFFCFB",
                                color: "#F21368",
                                borderColor: "#000272",
                              }}
                            >
                              {maskStudentName(student.studentName)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                statusMeta?.cls ||
                                "border-slate-200 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {statusMeta?.label || student.recruitmentPhase}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
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

function EligibilityUnlockOverlay() {
  return (
    <div className="fixed bottom-0 left-0 right-0 top-15 z-20 flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm md:top-0 md:left-72">
      <div className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white/90 p-6 text-center shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Access Locked</h2>
        <p className="mt-2 text-sm text-slate-600">
          To unlock, enroll in MicroDegree live classes. Please contact the
          support team.
        </p>
        <a
          href="tel:08047109999"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primaryDark"
        >
          Call 08047109999
        </a>
      </div>
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
      if (
        location.pathname.includes(
          "/superadmin/placement-status-pipeline/master-dashboard",
        )
      ) {
        return "Placement Status Pipeline - Master Dashboard";
      }
      if (
        location.pathname.includes(
          "/superadmin/placement-status-pipeline/interview-mapped-candidates",
        )
      ) {
        return "Placement Status Pipeline - Interview Mapped Candidates";
      }
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
      if (
        location.pathname.includes(
          "/admin/placement-status-pipeline/master-dashboard",
        )
      ) {
        return "Placement Status Pipeline - Master Dashboard";
      }
      if (
        location.pathname.includes(
          "/admin/placement-status-pipeline/interview-mapped-candidates",
        )
      ) {
        return "Placement Status Pipeline - Interview Mapped Candidates";
      }
      return "Admin Dashboard";
    }
    if (location.pathname.includes("/student/jobs")) return "Jobs (JD)";
    if (location.pathname.includes("/student/applications"))
      return "Application Status";
    if (location.pathname.includes("/student/help")) return "Help Center";
    return "Student Dashboard";
  }, [location.pathname, role]);

  const showProfile = role === ROLES.STUDENT;

  const navbarActionButton =
    role === ROLES.SUPER_ADMIN &&
    location.pathname.includes("/superadmin/dashboard")
      ? {
          label: "Placement Status Pipeline",
          href: "/superadmin/placement-status-pipeline/master-dashboard",
          target: "_blank",
        }
      : null;

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

  const isNonEligible = profile?.isEligible !== true;
  const shouldShowEligibilityOverlay =
    isStudent &&
    isNonEligible &&
    ["/student/career-guide", "/student/cloud-drive"].includes(
      location.pathname,
    );

  useEffect(() => {
    if (!shouldShowEligibilityOverlay) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldShowEligibilityOverlay]);

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

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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
            showJobAlertsCta={isStudentHome}
            actionButton={navbarActionButton}
          />

          <main
            className={`relative flex-1 ${isStudent ? "bg-slate-50 p-6 lg:p-7" : "p-6"}`}
          >
            {isStudentHome ? (
              <StudentDashboardHome profile={profile} />
            ) : (
              <Outlet />
            )}
            {shouldShowEligibilityOverlay ? <EligibilityUnlockOverlay /> : null}
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
