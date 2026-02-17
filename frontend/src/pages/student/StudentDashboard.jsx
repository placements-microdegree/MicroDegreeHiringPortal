import { useEffect, useMemo, useState } from "react";
import JobCard from "../../components/student/JobCard";
import ProfileCompletion from "../../components/student/ProfileCompletion";
import { useAuth } from "../../context/authStore";
import { calculateProfileCompletion } from "../../utils/calculateProfileCompletion";
import { listJobs } from "../../services/jobService";
import {
  createApplication,
  listApplicationsByStudent,
} from "../../services/applicationService";

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [message, setMessage] = useState("");

  const completion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile],
  );

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
      setMessage("You are not eligible to apply. Please contact support.");
      return;
    }
    const already = apps.some((a) => a.job_id === job.id || a.jobId === job.id);
    if (already) return;
    await createApplication({ jobId: job.id });
    await refresh();
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {message}{" "}
          {profile?.eligibleUntil
            ? `(Valid until ${new Date(profile.eligibleUntil).toLocaleDateString()})`
            : ""}
        </div>
      ) : null}
      <ProfileCompletion percent={completion} />

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
