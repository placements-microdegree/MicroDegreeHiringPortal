import { useEffect, useState } from "react";
import { getAnalytics } from "../../services/adminService";

const cardClass =
  "rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col gap-1";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    jobCount: 0,
    appCount: 0,
    studentCount: 0,
    eligibleCount: 0,
  });

  useEffect(() => {
    getAnalytics().then((data) => setStats((prev) => ({ ...prev, ...data })));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className={cardClass}>
        <div className="text-xs uppercase text-slate-500">Jobs</div>
        <div className="text-3xl font-bold text-slate-900">{stats.jobCount}</div>
      </div>
      <div className={cardClass}>
        <div className="text-xs uppercase text-slate-500">Applications</div>
        <div className="text-3xl font-bold text-slate-900">{stats.appCount}</div>
      </div>
      <div className={cardClass}>
        <div className="text-xs uppercase text-slate-500">Students</div>
        <div className="text-3xl font-bold text-slate-900">
          {stats.studentCount}
        </div>
        <div className="text-xs text-slate-500">
          Eligible: {stats.eligibleCount}
        </div>
      </div>
      <div className={cardClass}>
        <div className="text-xs uppercase text-slate-500">HR Admins</div>
        <div className="text-3xl font-bold text-slate-900">
          {stats.adminCount || "—"}
        </div>
        <div className="text-xs text-slate-500">Manage in Manage HR page</div>
      </div>
    </div>
  );
}
