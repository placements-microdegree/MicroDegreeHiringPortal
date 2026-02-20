import { APPLICATION_STATUSES } from "../../utils/constants";

export default function ApplicationsTable({ rows, onStatusChange }) {
  // console.log(rows);
  return (
    <div className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">Applications</div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-bgLight text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Resume</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={6}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.studentName || "Student"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.studentPhone || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.studentEmail || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.resumeUrl ? (
                      <a
                        className="text-primary underline"
                        href={r.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.jobTitle}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      value={r.status}
                      disabled={!onStatusChange}
                      onChange={(e) => onStatusChange?.(r.id, e.target.value)}
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
