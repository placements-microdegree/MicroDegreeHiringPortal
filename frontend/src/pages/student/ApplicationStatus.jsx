import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { listApplicationsByStudent } from "../../services/applicationService";
import { showError } from "../../utils/alerts";

export default function ApplicationStatus() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await listApplicationsByStudent();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      await showError(error?.message || "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="rounded-xl bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">
          Your Applications
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Refresh applications"
          title="Refresh"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-bgLight text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={3}>
                  Loading applications...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={3}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.jobs?.title || r.jobTitle || "Job"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.jobs?.company || r.company}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
