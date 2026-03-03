import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/authStore";
import JobCard from "../../components/student/JobCard";
import ApplyJobModal from "../../components/student/ApplyJobModal";
import Loader from "../../components/common/Loader";
import { listApplicationsByStudent } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { showError, showInfo } from "../../utils/alerts";

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
        listJobs(),
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Jobs (JD)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse open opportunities and apply to matching roles.
        </p>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Loader label="Loading jobs..." />
        </div>
      ) : safeJobs.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center text-base text-slate-600 shadow-sm">
          No jobs posted at the moment
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
