import { useEffect, useState } from "react";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import { deleteJob, listJobs } from "../../services/jobService";

export default function SuperAdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");

  const refreshJobs = async () => {
    const all = await listJobs();
    setJobs(all);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const onDeleteJob = async (job) => {
    await deleteJob(job.id);
    setMessage("JD deleted successfully.");
    await refreshJobs();
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      <JobListWithDelete
        jobs={jobs}
        onDelete={onDeleteJob}
        emptyMessage="No posted JDs yet."
      />
    </div>
  );
}
