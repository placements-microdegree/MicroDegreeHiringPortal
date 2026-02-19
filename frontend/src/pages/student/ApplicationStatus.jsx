import { useEffect, useState } from "react";
import { listApplicationsByStudent } from "../../services/applicationService";

export default function ApplicationStatus() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listApplicationsByStudent().then(setRows);
  }, []);

  return (
    <div className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">
        Your Applications
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
            {rows.length === 0 ? (
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
