import { useEffect, useMemo, useState } from "react";
import JDForm from "../../components/admin/JDForm";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import { useAuth } from "../../context/authStore";
import { createJob, deleteJob, listJobs } from "../../services/jobService";
import { showError, showSuccess } from "../../utils/alerts";

export default function PostJD() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);

  const refreshJobs = async () => {
    const all = await listJobs();
    setJobs(all);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const onSubmit = async (job) => {
    try {
      await createJob(job);
      await refreshJobs();
      await showSuccess("JD posted successfully.");
    } catch (err) {
      await showError(err?.message || "Failed to post JD", "Post Failed");
    }
  };

  const onDeleteJob = async (job) => {
    await deleteJob(job.id);
    await refreshJobs();
    await showSuccess("JD deleted successfully.");
  };

  const adminJobs = useMemo(() => {
    if (!user?.id) return jobs;
    return jobs.filter((job) => !job.posted_by || job.posted_by === user.id);
  }, [jobs, user?.id]);

  return (
    <div className="space-y-4">
      <JDForm onSubmit={onSubmit} />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900">
          Your Posted JDs
        </div>
        <div className="mt-4">
          <JobListWithDelete
            jobs={adminJobs}
            onDelete={onDeleteJob}
            emptyMessage="No posted JDs yet."
          />
        </div>
      </div>
    </div>
  );
}
