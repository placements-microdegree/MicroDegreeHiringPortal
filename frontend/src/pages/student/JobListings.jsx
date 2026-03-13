// FILE: src/pages/student/JobListings.jsx

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/authStore";
import JobCard from "../../components/student/JobCard";
import ApplyJobModal from "../../components/student/ApplyJobModal";
import Loader from "../../components/common/Loader";
import { listApplicationsByStudent } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { showError, showInfo } from "../../utils/alerts";
import { FiRefreshCw } from "react-icons/fi";

export default function JobListings() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        (Array.isArray(apps) ? apps : []).map((application) =>
          String(application?.job_id || application?.jobId || ""),
        ),
      ),
    [apps],
  );

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

  const safeJobs = Array.isArray(jobs) ? jobs : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Jobs (JD)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse open opportunities and apply to matching roles.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          title="Refresh jobs"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {/* Jobs grid */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading jobs..." />
        </div>
      ) : safeJobs.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
          <p className="text-base text-slate-600">
            No jobs posted at the moment
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <FiRefreshCw className="h-4 w-4" />
            Check again
          </button>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {safeJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={apply}
              applied={appliedJobIds.has(String(job?.id))}
            />
          ))}
        </section>
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
