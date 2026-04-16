import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import JobCardShimmer from "../../components/student/JobCardShimmer";
import {
  getStudentAnalytics,
  listCareerProgressBoard,
  listApplicationsByStudent,
} from "../../services/applicationService";
import { listJobs } from "../../services/jobService";

const analyticsMeta = [
  { key: "totalJobs", label: "Total Jobs Available" },
  { key: "totalApplications", label: "Applications Submitted" },
  { key: "mappedToClient", label: "Mapped to Client" },
  { key: "interviewScheduled", label: "Interview scheduled" },
  { key: "placed", label: "Placed" },
];

const RECENT_JOBS_SUBTITLE =
  "Latest opportunities for you (closed jobs cannot be applied)";

const statusClass = {
  Applied: "bg-slate-100 text-slate-700",
  "Resume Not Matched": "bg-red-100 text-red-700",
  "Mapped to Client": "bg-blue-100 text-blue-700",
  "Screening call Received": "bg-amber-100 text-amber-700",
  "screening Discolified": "bg-red-100 text-red-700",
  "Interview scheduled": "bg-blue-100 text-blue-700",
  "Interview Not Cleared": "bg-rose-100 text-rose-700",
  "Technical Round": "bg-blue-100 text-blue-700",
  "final Round": "bg-blue-100 text-blue-700",
  Placed: "bg-emerald-100 text-emerald-700",
  "Job on hold": "bg-red-100 text-red-700",
  "Position closed": "bg-red-100 text-red-700",
};

function normalizeApplicationStatus(status) {
  const value = String(status || "").trim();
  if (!value) return "Applied";
  if (value === "ResumeScreeningRejected") return "Resume Not Matched";
  if (value === "Selected") return "Placed";
  if (value === "Interview") return "Interview scheduled";
  if (value === "Shortlisted") return "Screening call Received";
  if (value === "Resume Screening Rejected") return "Resume Not Matched";
  if (value === "Profile Mapped for client") return "Mapped to Client";
  if (value === "Interview Scheduled") return "Interview scheduled";
  if (value === "Final Round") return "final Round";
  if (value === "Client Rejected") return "screening Discolified";
  if (value === "Rejected") return "screening Discolified";
  if (value === "Position Closed") return "Position closed";
  if (value === "Job on hold/ position closed") return "Position closed";
  return value;
}

function formatDate(dateInput) {
  if (!dateInput) return "Not specified";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString();
}

function getEligibilityText(eligibility) {
  if (eligibility?.type === "eligible_until") {
    return `Eligible until ${formatDate(eligibility?.eligibleUntil)}`;
  }

  const remaining = Number(eligibility?.remainingApplications ?? 0);
  return `Applications remaining: ${remaining}`;
}

function sortJobsForStudent(a, b) {
  const aIsActive =
    String(a?.status || "")
      .trim()
      .toLowerCase() === "active";
  const bIsActive =
    String(b?.status || "")
      .trim()
      .toLowerCase() === "active";

  if (aIsActive !== bIsActive) return bIsActive ? 1 : -1;

  const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
  const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
  return bTime - aTime;
}

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState({
    totalJobs: 0,
    totalApplications: 0,
    statusCounts: {},
    eligibility: null,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [careerProgressBoard, setCareerProgressBoard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, jobsData, appsData, progressData] =
        await Promise.all([
          getStudentAnalytics(),
          listJobs(),
          listApplicationsByStudent(),
          listCareerProgressBoard(),
        ]);

      setAnalytics({
        totalJobs: Number(analyticsData?.totalJobs || 0),
        totalApplications: Number(analyticsData?.totalApplications || 0),
        statusCounts: analyticsData?.statusCounts || {},
        eligibility: analyticsData?.eligibility || null,
      });

      const safeJobs = Array.isArray(jobsData) ? jobsData : [];
      const safeApps = Array.isArray(appsData) ? appsData : [];

      setRecentJobs([...safeJobs].sort(sortJobsForStudent).slice(0, 4));
      setAllApplications(safeApps);

      setRecentApplications(
        [...safeApps]
          .sort(
            (a, b) =>
              new Date(b?.created_at || b?.createdAt || 0).getTime() -
              new Date(a?.created_at || a?.createdAt || 0).getTime(),
          )
          .slice(0, 5),
      );

      setCareerProgressBoard(Array.isArray(progressData) ? progressData : []);
    } catch {
      setAnalytics({
        totalJobs: 0,
        totalApplications: 0,
        statusCounts: {},
        eligibility: null,
      });
      setRecentJobs([]);
      setAllApplications([]);
      setRecentApplications([]);
      setCareerProgressBoard([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const analyticsValues = useMemo(
    () => ({
      totalJobs: analytics.totalJobs,
      totalApplications: analytics.totalApplications,
      mappedToClient: Number(
        (analytics.statusCounts?.["Mapped to Client"] || 0) +
          (analytics.statusCounts?.["Profile Mapped for client"] || 0),
      ),
      interviewScheduled: Number(
        (analytics.statusCounts?.["Interview scheduled"] || 0) +
          (analytics.statusCounts?.Interview || 0) +
          (analytics.statusCounts?.["Interview Scheduled"] || 0),
      ),
      placed: Number(
        (analytics.statusCounts?.Placed || 0) +
          (analytics.statusCounts?.Selected || 0),
      ),
    }),
    [analytics],
  );

  const appliedJobIds = useMemo(
    () =>
      new Set(
        (Array.isArray(allApplications) ? allApplications : [])
          .map((application) =>
            String(
              application?.job_id ||
                application?.jobId ||
                application?.jobs?.id ||
                application?.job?.id ||
                "",
            ),
          )
          .filter(Boolean),
      ),
    [allApplications],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {analyticsMeta.map((card) => (
            <article
              key={`${card.key}-skeleton`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="shimmer h-3 w-28 rounded-md" />
              <div className="mt-3 shimmer h-8 w-16 rounded-md" />
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 shadow-sm">
          <div className="shimmer h-3 w-24 rounded-md" />
          <div className="mt-2 shimmer h-6 w-60 rounded-md" />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Jobs
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {RECENT_JOBS_SUBTITLE}
                </p>
              </div>
              <div className="shimmer h-4 w-16 rounded-md" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <JobCardShimmer
                  key={`dashboard-job-shimmer-${index + 1}`}
                  compact
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="shimmer h-5 w-40 rounded-md" />
              <div className="shimmer h-4 w-16 rounded-md" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`dashboard-application-shimmer-${index + 1}`}
                  className="rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div className="shimmer h-4 w-36 rounded-md" />
                  <div className="mt-2 shimmer h-3 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {analyticsMeta.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {analyticsValues[card.key]}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-700">
          Eligibility Status
        </div>
        <div className="mt-2 text-lg font-semibold text-blue-900">
          {getEligibilityText(analytics.eligibility)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Jobs
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {RECENT_JOBS_SUBTITLE}
              </p>
            </div>
            <Link
              to="/student/jobs"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primaryDark"
            >
              View all
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              No recent jobs available.
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => {
                const isApplied = appliedJobIds.has(String(job?.id || ""));
                const isClosed =
                  String(job?.status || "")
                    .trim()
                    .toLowerCase() === "closed";
                let actionLabel = "Apply";
                if (isApplied) actionLabel = "Update";
                else if (isClosed) actionLabel = "Closed";

                return (
                  <article
                    key={job.id}
                    className="rounded-xl border border-slate-200 px-4 py-3 transition hover:border-primary/20 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {job?.title || "Job"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {job?.company || "Company"} |{" "}
                          {job?.location || "Location not specified"}
                        </p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {job?.ctc || "CTC not specified"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Valid till:{" "}
                      {formatDate(job?.valid_till || job?.validTill)}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        to="/student/jobs"
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isApplied ? "bg-primary text-white hover:bg-primary/90" : "border border-slate-200 text-slate-700 hover:border-primary hover:text-primary"}`}
                      >
                        {actionLabel}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Applications
            </h2>
            <Link
              to="/student/applications"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primaryDark"
            >
              View all
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              No applications submitted yet.
            </div>
          ) : (
            <ol className="space-y-3">
              {recentApplications.map((application, index) => {
                const status = normalizeApplicationStatus(
                  application?.sub_stage || application?.status,
                );
                const timelineClass =
                  statusClass[status] || "bg-slate-100 text-slate-700";
                const showConnector = index < recentApplications.length - 1;
                return (
                  <li
                    key={application.id}
                    className="relative rounded-xl border border-slate-200 px-4 py-3 pl-8"
                  >
                    <span className="absolute left-3 top-5 h-2.5 w-2.5 rounded-full bg-primary" />
                    {showConnector ? (
                      <div className="absolute left-3.75 top-7 h-[calc(100%+10px)] w-px bg-slate-200" />
                    ) : null}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-900">
                          {application?.jobs?.title ||
                            application?.jobTitle ||
                            "Job"}
                        </div>
                        <div className="text-sm text-slate-600">
                          {application?.jobs?.company ||
                            application?.company ||
                            "Company"}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${timelineClass}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Applied on{" "}
                      {formatDate(
                        application?.created_at || application?.createdAt,
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Our Students • Career Progress Board
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              See how students are progressing in interview and placement
              stages.
            </p>
          </div>
          {/* <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Live Career Updates
          </span> */}
        </div>

        {careerProgressBoard.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            No student progress updates available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {careerProgressBoard.map((company) => (
              <article
                key={`${company.companyName}-${company.jobTitle || "Job Role"}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
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
                    const timelineClass =
                      statusClass[student.recruitmentPhase] ||
                      "bg-slate-100 text-slate-700";

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
                          {student.studentName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${timelineClass}`}
                        >
                          {student.recruitmentPhase}
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
    </div>
  );
}
