import { useEffect, useMemo, useState } from "react";
import { FiBarChart2, FiUsers, FiTrendingUp } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { getResumeBuilderAnalytics } from "../../services/resumeBuilderService";
import { showError } from "../../utils/alerts";

const cardClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function SuperAdminResumeBuilderAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    uniqueStudents: 0,
    lastClickedAt: null,
    topStudent: null,
    topStudents: [],
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getResumeBuilderAnalytics();
      setAnalytics({
        totalClicks: Number(data?.totalClicks || 0),
        uniqueStudents: Number(data?.uniqueStudents || 0),
        lastClickedAt: data?.lastClickedAt || null,
        topStudent: data?.topStudent || null,
        topStudents: Array.isArray(data?.topStudents) ? data.topStudents : [],
      });
    } catch (err) {
      await showError(
        err?.message || "Failed to load resume builder analytics",
        "Analytics Error",
      );
      setAnalytics({
        totalClicks: 0,
        uniqueStudents: 0,
        lastClickedAt: null,
        topStudent: null,
        topStudents: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => analytics.topStudents || [], [analytics.topStudents]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Resume Builder Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track student clicks on Resume Builder and identify top users.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiBarChart2 className="h-4 w-4" />
            Total Clicks
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.totalClicks}
          </div>
        </div>

        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiUsers className="h-4 w-4" />
            Unique Students
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.uniqueStudents}
          </div>
        </div>

        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiTrendingUp className="h-4 w-4" />
            Most Active Student
          </div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {analytics.topStudent?.fullName || "-"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {analytics.topStudent
              ? `${Number(analytics.topStudent.clickCount || 0)} clicks`
              : "No click data yet"}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8">
            <Loader label="Loading analytics..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">Last Clicked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.studentId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-900">{row.fullName || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {Number(row.clickCount || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(row.lastClickedAt)}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No resume builder clicks recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Last click recorded: {formatDateTime(analytics.lastClickedAt)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
