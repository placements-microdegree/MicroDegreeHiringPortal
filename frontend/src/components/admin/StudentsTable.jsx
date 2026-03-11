// FILE: src/components/admin/StudentsTable.jsx

import { FiFileText, FiExternalLink } from "react-icons/fi";

export default function StudentsTable({ rows }) {
  return (
    <div className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">Students</div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-bgLight text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Eligibility</th>
              <th className="px-4 py-3">Resume</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((r) => (
                <tr key={r.email} className="border-t border-slate-200 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.fullName || "Student"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.email}</td>
                  <td className="px-4 py-3 text-slate-700">{r.location || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.phone || "-"}</td>
                  <td className="px-4 py-3">
                    {r.isEligible ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs  text-emerald-700">
                        Eligible{r.eligibleUntil ? ` until ${new Date(r.eligibleUntil).toLocaleDateString()}` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                        Not eligible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.resumeUrl ? (
                      <a
                        href={r.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                        <FiFileText className="h-3.5 w-3.5" />
                        No resume
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={6}>
                  No students loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}