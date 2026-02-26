import { useEffect, useState } from "react";
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
      const [j, a] = await Promise.all([
        listJobs(),
        listApplicationsByStudent(),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setApps(Array.isArray(a) ? a : []);
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
    const already = apps.some((a) => a.job_id === job.id || a.jobId === job.id);
    if (already) {
      await showInfo("You already applied for this job.", "Already Applied");
      return;
    }

    setSelectedJob(job);
    setApplyOpen(true);
  };

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeApps = Array.isArray(apps) ? apps : [];
  let jobsContent = null;

  if (isLoading) {
    jobsContent = (
      <div className="rounded-xl bg-white p-5">
        <Loader label="Loading jobs..." />
      </div>
    );
  } else if (safeJobs.length === 0) {
    jobsContent = (
      <div className="rounded-xl bg-white p-8 text-center text-slate-600">
        No jobs posted at the moment
      </div>
    );
  } else {
    jobsContent = (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {safeJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onApply={apply}
            applied={safeApps.some(
              (a) => a.job_id === job.id || a.jobId === job.id,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobsContent}

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
