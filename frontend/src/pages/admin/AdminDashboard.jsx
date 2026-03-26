import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { listAllApplications } from "../../services/applicationService";
import { deleteJob, listJobs, updateJob } from "../../services/jobService";
import Modal from "../../components/common/Modal";
import JDForm from "../../components/admin/JDForm";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../context/authStore";
import { showError, showSuccess } from "../../utils/alerts";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isSameUtcDay(value, targetDate = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getUTCFullYear() === targetDate.getUTCFullYear() &&
    date.getUTCMonth() === targetDate.getUTCMonth() &&
    date.getUTCDate() === targetDate.getUTCDate()
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [editingJob, setEditingJob] = useState(null);

  const actorId = profile?.id || user?.id || null;

  const canScopeByOwner = useMemo(() => {
    if (!actorId) return false;

    const hasJobOwnerData = jobs.some((job) => Boolean(job?.posted_by));
    const hasApplicationOwnerData = applications.some((app) =>
      Boolean(app?.job?.posted_by),
    );

    return hasJobOwnerData || hasApplicationOwnerData;
  }, [jobs, applications, actorId]);

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listedJobs, apps] = await Promise.all([
        listJobs({ includeClosed: true }),
        listAllApplications(),
      ]);
      setJobs(Array.isArray(listedJobs) ? listedJobs : []);
      setApplications(Array.isArray(apps) ? apps : []);
    } catch (err) {
      setJobs([]);
      setApplications([]);
      await showError(err?.message || "Failed to load admin dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const myJobs = useMemo(() => {
    if (!canScopeByOwner) return jobs;
    return jobs.filter(
      (job) => String(job?.posted_by || "") === String(actorId),
    );
  }, [jobs, actorId, canScopeByOwner]);

  const myJobIds = useMemo(
    () => new Set(myJobs.map((job) => String(job.id)).filter(Boolean)),
    [myJobs],
  );

  const myApplications = useMemo(() => {
    if (!canScopeByOwner) return applications;

    return applications.filter((app) => {
      const jobId = String(app?.job?.id || app?.job_id || "");
      const postedBy = String(app?.job?.posted_by || "");
      if (myJobIds.has(jobId)) return true;
      return postedBy && postedBy === String(actorId);
    });
  }, [applications, myJobIds, actorId, canScopeByOwner]);

  const shouldUseOverallFallback = useMemo(() => {
    if (!canScopeByOwner) return true;

    const scopedHasData = myJobs.length > 0 || myApplications.length > 0;
    const overallHasData = jobs.length > 0 || applications.length > 0;

    return !scopedHasData && overallHasData;
  }, [
    canScopeByOwner,
    myJobs.length,
    myApplications.length,
    jobs.length,
    applications.length,
  ]);

  const displayJobs = shouldUseOverallFallback ? jobs : myJobs;
  const displayApplications = shouldUseOverallFallback
    ? applications
    : myApplications;

  const scopeLabel = shouldUseOverallFallback ? "All" : "My";

  const myStatusCounts = useMemo(() => {
    const counts = {};
    displayApplications.forEach((app) => {
      const status = String(app?.sub_stage || app?.status || "Applied").trim();
      if (!status) return;
      counts[status] = Number(counts[status] || 0) + 1;
    });
    return counts;
  }, [displayApplications]);

  const metrics = useMemo(() => {
    const totalMyJobs = displayJobs.length;
    const activeMyJobs = displayJobs.filter(
      (job) => normalizeText(job?.status) === "active",
    ).length;
    const totalMyApplications = displayApplications.length;

    const newApplicationsToday = displayApplications.filter((app) =>
      isSameUtcDay(app?.created_at),
    ).length;

    const interviewInProgress = displayApplications.filter((app) => {
      const status = normalizeText(app?.sub_stage || app?.status);
      return (
        status === "interview scheduled" ||
        status === "technical round" ||
        status === "final round"
      );
    }).length;

    const placedCount = displayApplications.filter((app) => {
      const status = normalizeText(app?.sub_stage || app?.status);
      return status === "placed" || status === "selected";
    }).length;

    const conversionRate =
      totalMyApplications > 0
        ? ((placedCount / totalMyApplications) * 100).toFixed(1)
        : "0.0";

    return {
      totalMyJobs,
      activeMyJobs,
      totalMyApplications,
      newApplicationsToday,
      interviewInProgress,
      placedCount,
      conversionRate,
      avgApplicationsPerJob:
        totalMyJobs > 0
          ? (totalMyApplications / totalMyJobs).toFixed(1)
          : "0.0",
    };
  }, [displayJobs, displayApplications]);

  const topStatuses = useMemo(
    () =>
      Object.entries(myStatusCounts)
        .map(([status, count]) => ({ status, count: Number(count || 0) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [myStatusCounts],
  );

  const recentMyApplications = useMemo(
    () =>
      [...displayApplications]
        .sort(
          (a, b) =>
            new Date(b?.updated_at || b?.created_at || 0).getTime() -
            new Date(a?.updated_at || a?.created_at || 0).getTime(),
        )
        .slice(0, 5),
    [displayApplications],
  );

  const onDeleteJob = async (job) => {
    await deleteJob(job.id);
    await refreshDashboard();
    await showSuccess("JD deleted successfully.");
  };

  const onStartEdit = (job) => {
    setEditingJob(job);
  };

  const onCloseEdit = () => {
    setEditingJob(null);
  };

  const onUpdateJob = async (payload) => {
    if (!editingJob?.id) return;

    try {
      await updateJob(editingJob.id, payload);
      await refreshDashboard();
      await showSuccess("JD updated successfully.");
      onCloseEdit();
    } catch (err) {
      await showError(err?.message || "Failed to update JD", "Update Failed");
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <Loader label="Loading HR dashboard metrics..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-blue-700">
                  {scopeLabel} Jobs
                </div>
                <FiBriefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-900">
                {metrics.totalMyJobs}
              </div>
              <p className="mt-1 text-xs text-blue-700">
                Active: {metrics.activeMyJobs}
              </p>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-violet-700">
                  Applications on {scopeLabel} Jobs
                </div>
                <FiUsers className="h-5 w-5 text-violet-600" />
              </div>
              <div className="mt-2 text-3xl font-bold text-violet-900">
                {metrics.totalMyApplications}
              </div>
              <p className="mt-1 text-xs text-violet-700">
                Avg / job: {metrics.avgApplicationsPerJob}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-700">
                  Pipeline Today
                </div>
                <FiClock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="mt-2 text-3xl font-bold text-amber-900">
                {metrics.newApplicationsToday}
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Interview in progress: {metrics.interviewInProgress}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-emerald-700">
                  Placement Outcomes
                </div>
                <FiCheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-900">
                {metrics.placedCount}
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Conversion: {metrics.conversionRate}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-900">
                <FiTrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">
                  {scopeLabel} Top Pipeline Statuses
                </h2>
              </div>

              {topStatuses.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No application status data found.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topStatuses.map((item) => {
                    const denominator = metrics.totalMyApplications || 1;
                    const width = Math.max(
                      8,
                      Math.round((item.count / denominator) * 100),
                    );

                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {item.status}
                          </span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div
                            className="h-2.5 rounded-full bg-primary"
                            style={{ width: `${Math.min(width, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold text-slate-900">
                Recent Activity on {scopeLabel} Jobs
              </h2>

              {shouldUseOverallFallback && (
                <p className="mt-2 text-xs text-amber-700">
                  Showing overall admin analytics because owner-mapped data is
                  unavailable for this account.
                </p>
              )}

              {!canScopeByOwner && (
                <p className="mt-2 text-xs text-amber-700">
                  Showing overall admin data because owner mapping is
                  unavailable on some older records.
                </p>
              )}

              {recentMyApplications.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No recent activity yet. Once students apply to your jobs, it
                  will appear here.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recentMyApplications.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-slate-800">
                        {app?.student?.full_name || "Student"} ·{" "}
                        {app?.job?.title || "Job"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Status: {app?.sub_stage || app?.status || "Applied"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Updated:{" "}
                        {formatDateTime(app?.updated_at || app?.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900">Posted JDs</div>
        <div className="mt-4">
          <JobListWithDelete
            jobs={jobs}
            onEdit={onStartEdit}
            onDelete={onDeleteJob}
            emptyMessage="No posted JDs yet."
          />
        </div>
      </div>

      <Modal
        title="Edit JD"
        open={Boolean(editingJob)}
        onClose={onCloseEdit}
        maxWidthClass="max-w-[980px]"
        scrollable
      >
        <JDForm
          initialValues={editingJob}
          onSubmit={onUpdateJob}
          title="Edit Job Description"
          submitLabel="Update JD"
          savingLabel="Updating..."
          onCancel={onCloseEdit}
          resetOnSuccess={false}
        />
      </Modal>
    </div>
  );
}
