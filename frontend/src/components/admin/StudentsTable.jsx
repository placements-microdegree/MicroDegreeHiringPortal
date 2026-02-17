export default function StudentsTable({ rows }) {
  // console.log(rows);
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
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((r) => (
                <tr key={r.email} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.fullName || "Student"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.email}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.location || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.phone || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.isEligible
                      ? `Eligible until ${
                          r.eligibleUntil
                            ? new Date(r.eligibleUntil).toLocaleDateString()
                            : ""
                        }`
                      : "Not eligible"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={5}>
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
