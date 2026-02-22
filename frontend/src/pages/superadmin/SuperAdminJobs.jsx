import { useEffect, useState } from "react";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import { deleteJob, listJobs } from "../../services/jobService";
import { showError, showSuccess } from "../../utils/alerts";

export default function SuperAdminJobs() {
  const [jobs, setJobs] = useState([]);

  const refreshJobs = async () => {
    const all = await listJobs();
    setJobs(all);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const onDeleteJob = async (job) => {
    try {
      await deleteJob(job.id);
      await refreshJobs();
      await showSuccess("JD deleted successfully.");
    } catch (err) {
      await showError(err?.message || "Failed to delete JD", "Delete Failed");
    }
  };

  return (
    <div className="space-y-4">
      <JobListWithDelete
        jobs={jobs}
        onDelete={onDeleteJob}
        emptyMessage="No posted JDs yet."
      />
    </div>
  );
}
