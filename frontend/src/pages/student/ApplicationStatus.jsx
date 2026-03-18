import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { listApplicationsByStudent } from "../../services/applicationService";
import { showError } from "../../utils/alerts";

const statusClassMap = {
  Applied: "bg-slate-100 text-slate-700",
  "Screening call Received": "bg-amber-100 text-amber-700",
  Shortlisted: "bg-blue-100 text-blue-700",
  Interview: "bg-orange-100 text-orange-700",
  "Interview Scheduled": "bg-indigo-100 text-indigo-700",
  "Interview Not Cleared": "bg-rose-100 text-rose-700",
  "Technical Round": "bg-violet-100 text-violet-700",
  "Final Round": "bg-fuchsia-100 text-fuchsia-700",
  Selected: "bg-emerald-100 text-emerald-700",
  Placed: "bg-emerald-100 text-emerald-700",
  "Position Closed": "bg-slate-200 text-slate-700",
  Rejected: "bg-red-100 text-red-700",
  "Resume Screening Rejected": "bg-rose-100 text-rose-700",
  "Profile Mapped for client": "bg-yellow-100 text-yellow-700",
  "Client Rejected": "bg-rose-100 text-rose-700",
};

function formatDate(dateInput) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

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

  let tableBodyContent;
  if (isLoading) {
    tableBodyContent = (
      <tr>
        <td className="px-4 py-4 text-slate-600" colSpan={5}>
          Loading applications...
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    tableBodyContent = (
      <tr>
        <td className="px-4 py-5 text-center text-slate-600" colSpan={5}>
          No applications yet.
        </td>
      </tr>
    );
  } else {
    tableBodyContent = rows.map((row) => {
      const status = row?.sub_stage || row?.status || "Applied";
      const statusClass =
        statusClassMap[status] || "bg-slate-100 text-slate-700";

      return (
        <tr key={row.id} className="border-t border-slate-200">
          <td className="px-4 py-3 font-medium text-slate-900">
            {row?.jobs?.title || row?.jobTitle || "Job"}
          </td>
          <td className="px-4 py-3 text-slate-700">
            {row?.jobs?.company || row?.company || "Company"}
          </td>
          <td className="px-4 py-3 text-slate-700">
            {formatDate(row?.created_at || row?.createdAt)}
          </td>
          <td className="px-4 py-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {status}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-700">
            {row?.hr_comment_2 || "-"}
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Application Status
          </h1>
          <p className="text-sm text-slate-600">
            Track your submitted applications and current progress.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Refresh applications"
          title="Refresh"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 p-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Job Title</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Applied Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Comment</th>
            </tr>
          </thead>
          <tbody>{tableBodyContent}</tbody>
        </table>
      </div>
    </div>
  );
}
