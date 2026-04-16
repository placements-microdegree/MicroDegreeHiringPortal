// FILE: src/pages/student/JobListings.jsx

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/authStore";
import JobCard from "../../components/student/JobCard";
import JobCardShimmer from "../../components/student/JobCardShimmer";
import ApplyJobModal from "../../components/student/ApplyJobModal";
import { listApplicationsByStudent } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { confirmDanger, showError, showInfo } from "../../utils/alerts";
import { FiRefreshCw } from "react-icons/fi";

export default function JobListings() {
  const { profile, updateEmailSubscription } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applyMode, setApplyMode] = useState("apply");
  const [applyOpen, setApplyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [emailSubscribe, setEmailSubscribe] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  useEffect(() => {
    if (profile?.isEligible === true) {
      setEmailSubscribe(
        typeof profile?.emailSubscribe === "boolean"
          ? profile.emailSubscribe
          : true,
      );
      return;
    }

    setEmailSubscribe(false);
  }, [profile?.isEligible, profile?.emailSubscribe]);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [jobRows, appRows] = await Promise.all([
        listJobs({ includeClosed: true }),
        listApplicationsByStudent(),
      ]);
      setJobs(Array.isArray(jobRows) ? jobRows : []);
      setApps(Array.isArray(appRows) ? appRows : []);
    } catch (error) {
      setJobs([]);
      setApps([]);
      await showError(error?.message || "Failed to load jobs");
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
        (Array.isArray(apps) ? apps : [])
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
    [apps],
  );

  const appliedByJobId = useMemo(() => {
    const map = new Map();
    (Array.isArray(apps) ? apps : []).forEach((application) => {
      const jobId = String(
        application?.job_id ||
          application?.jobId ||
          application?.jobs?.id ||
          application?.job?.id ||
          "",
      );
      if (jobId) map.set(jobId, application);
    });
    return map;
  }, [apps]);

  const apply = async (job) => {
    const jobId = String(job?.id || "");
    const existingApplication = appliedByJobId.get(jobId) || null;

    if (existingApplication) {
      setSelectedJob(job);
      setSelectedApplication(existingApplication);
      setApplyMode("update");
      setApplyOpen(true);
      return;
    }

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

    setSelectedJob(job);
    setSelectedApplication(null);
    setApplyMode("apply");
    setApplyOpen(true);
  };

  const onToggleEmailSubscription = async (event) => {
    const nextChecked = Boolean(event.target.checked);

    if (profile?.isEligible !== true) {
      return;
    }

    if (!nextChecked) {
      const confirmed = await confirmDanger({
        title: "Are you sure you want to unsubscribe?",
        text: "If you unsubscribe, you will stop receiving premium job email alerts.",
        confirmButtonText: "Yes, Unsubscribe",
        cancelButtonText: "No, Keep Subscribed",
      });

      if (!confirmed) {
        setEmailSubscribe(true);
        return;
      }
    }

    setEmailSubscribe(nextChecked);
    setIsUpdatingSubscription(true);
    try {
      const saved = await updateEmailSubscription(nextChecked);
      setEmailSubscribe(Boolean(saved?.emailSubscribe));
    } catch (error) {
      setEmailSubscribe((prev) => !prev);
      await showError(
        error?.message || "Failed to update premium job email preference",
      );
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const sortedJobs = useMemo(() => {
    return [...safeJobs].sort((a, b) => {
      const aIsActive =
        String(a?.status || "")
          .trim()
          .toLowerCase() === "active";
      const bIsActive =
        String(b?.status || "")
          .trim()
          .toLowerCase() === "active";

      // Keep active jobs above closed jobs for student listings.
      if (aIsActive !== bIsActive) return bIsActive ? 1 : -1;

      // Within the same status, prefer latest activity timestamp.
      const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [safeJobs]);

  let jobsContent;
  if (isLoading) {
    jobsContent = (
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <JobCardShimmer key={`job-shimmer-${index + 1}`} />
        ))}
      </section>
    );
  } else if (sortedJobs.length === 0) {
    jobsContent = (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
        <p className="text-base text-slate-600">No jobs posted at the moment</p>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          <FiRefreshCw className="h-4 w-4" />
          Check again
        </button>
      </div>
    );
  } else {
    jobsContent = (
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sortedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onApply={apply}
            applied={appliedJobIds.has(String(job?.id))}
            updateAllowed={appliedJobIds.has(String(job?.id))}
          />
        ))}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Jobs (JD)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Browse open opportunities and apply to matching roles.
            </p>

            <label
              className={`mt-3 flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-5 sm:inline-flex sm:w-auto sm:items-center ${
                profile?.isEligible === true
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title={
                profile?.isEligible === true
                  ? "Receive premium job email alerts. Uncheck to stop receiving emails."
                  : "To use this feature, become a MicroDegree eligible student and contact the support team."
              }
            >
              <input
                type="checkbox"
                checked={emailSubscribe}
                disabled={
                  profile?.isEligible !== true || isUpdatingSubscription
                }
                onChange={onToggleEmailSubscription}
                className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0"
              />
              <span className="font-medium">
                Receive email updates of premium jobs
              </span>
            </label>

            {profile?.isEligible !== true ? (
              <p className="mt-2 text-xs text-slate-500">
                To use this feature, become a MicroDegree eligible student and
                contact support.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            title="Refresh jobs"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* Jobs grid */}
      {jobsContent}

      <ApplyJobModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={selectedJob}
        mode={applyMode}
        existingApplication={selectedApplication}
        profile={profile}
        onApplied={refresh}
      />
    </div>
  );
}
