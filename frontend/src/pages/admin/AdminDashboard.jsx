import { useEffect, useState } from "react";
import { listAllApplications } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";

export default function AdminDashboard() {
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);

  useEffect(() => {
    Promise.all([listJobs(), listAllApplications()]).then(([jobs, apps]) => {
      setJobCount(jobs.length);
      setAppCount(apps.length);
    });
  }, []);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="rounded-xl bg-white p-5">
        <div className="text-sm font-semibold text-slate-700">Posted Jobs</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">{jobCount}</div>
      </div>
      <div className="rounded-xl bg-white p-5">
        <div className="text-sm font-semibold text-slate-700">Applications</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">{appCount}</div>
      </div>
      <div className="rounded-xl bg-white p-5">
        <div className="text-sm font-semibold text-slate-700">Actions</div>
        <div className="mt-2 text-sm text-slate-600">
          Use "Post JD" to publish roles.
        </div>
      </div>
    </div>
  );
}
