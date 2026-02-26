import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader";
import { getStudentAnalytics } from "../../services/applicationService";

const STATUS_ORDER = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Rejected",
  "Selected",
];

const cardClass = "rounded-xl bg-white p-5 shadow-sm border border-slate-100";

function formatEligibility(eligibility) {
  if (eligibility?.type === "eligible_until") {
    const date = eligibility?.eligibleUntil
      ? new Date(eligibility.eligibleUntil)
      : null;
    const isValidDate = date && !Number.isNaN(date.getTime());
    return isValidDate
      ? `Eligible until ${date.toLocaleDateString()}`
      : "Eligible until —";
  }

  const remaining = Number(eligibility?.remainingApplications ?? 0);
  return `Limited applications remaining: ${remaining}`;
}

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState({
    totalJobs: 0,
    totalApplications: 0,
    statusCounts: {},
    eligibility: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await getStudentAnalytics();
      setAnalytics({
        totalJobs: Number(data?.totalJobs || 0),
        totalApplications: Number(data?.totalApplications || 0),
        statusCounts: data?.statusCounts || {},
        eligibility: data?.eligibility || null,
      });
    } catch {
      setAnalytics({
        totalJobs: 0,
        totalApplications: 0,
        statusCounts: {},
        eligibility: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="rounded-xl bg-white p-5">
          <Loader label="Loading dashboard analytics..." />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass}>
          <div className="text-xs uppercase text-slate-500">
            Total Jobs Available
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.totalJobs}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs uppercase text-slate-500">
            Total Applications Submitted
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.totalApplications}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs uppercase text-slate-500">
            Eligibility Status
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {formatEligibility(analytics.eligibility)}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs uppercase text-slate-500">
            Applications Breakdown
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center justify-between">
                <span>{status}</span>
                <span className="font-semibold text-slate-900">
                  {Number(analytics.statusCounts?.[status] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
