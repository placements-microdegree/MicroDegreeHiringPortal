import { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import JobCard from "../../components/student/JobCard";
import {
  createApplication,
  listApplicationsByStudent,
} from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { showInfo } from "../../utils/alerts";

export default function JobListings() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);

  const refresh = async () => {
    const [j, a] = await Promise.all([listJobs(), listApplicationsByStudent()]);
    setJobs(j);
    setApps(a);
  };

  useEffect(() => {
    refresh();
  }, []);

  const apply = async (job) => {
    if (!profile?.isEligible) {
      await showInfo(
        "You are not eligible to apply. Please contact support.",
        "Not Eligible",
      );
      return;
    }
    const already = apps.some((a) => a.job_id === job.id || a.jobId === job.id);
    if (already) return;
    await createApplication({ jobId: job.id });
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onApply={apply}
            applied={apps.some(
              (a) => a.job_id === job.id || a.jobId === job.id,
            )}
          />
        ))}
      </div>
    </div>
  );
}
