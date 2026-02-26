import { useEffect, useState } from "react";
import { listAllApplications } from "../../services/applicationService";
import { deleteJob, listJobs } from "../../services/jobService";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import { showSuccess } from "../../utils/alerts";

export default function AdminDashboard() {
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [jobs, setJobs] = useState([]);

  const refreshDashboard = async () => {
    const [listedJobs, apps] = await Promise.all([
      listJobs(),
      listAllApplications(),
    ]);
    setJobs(listedJobs);
    setJobCount(listedJobs.length);
    setAppCount(apps.length);
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const onDeleteJob = async (job) => {
    await deleteJob(job.id);
    await refreshDashboard();
    await showSuccess("JD deleted successfully.");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">
            Posted Jobs
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {jobCount}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">
            Applications
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {appCount}
          </div>
        </div>
        {/* <div className="rounded-xl bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">Actions</div>
          <div className="mt-2 text-sm text-slate-600">
            View and delete posted JDs below.
          </div>
        </div> */}
      </div>

      <div className="rounded-xl   p-4">
        <div className="text-base font-semibold text-slate-900">Posted JDs</div>
        <div className="mt-4">
          <JobListWithDelete
            jobs={jobs}
            onDelete={onDeleteJob}
            emptyMessage="No posted JDs yet."
          />
        </div>
      </div>
    </div>
  );
}
