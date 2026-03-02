import { useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { checkerSearch } from "../../services/adminService";
import { showError } from "../../utils/alerts";

const panelClass = "rounded-xl border border-slate-200 bg-white p-4";

export default function SuperAdminChecker() {
  const [searchType, setSearchType] = useState("email");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const value = query.trim();

    if (!value) {
      await showError(`Please enter ${searchType}`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await checkerSearch({ type: searchType, query: value });
      setStudent(result.student);
      setApplications(result.applications || []);

      if (!result.student) {
        setMessage("No student found for this search.");
      }
    } catch (err) {
      setStudent(null);
      setApplications([]);
      setMessage("");
      await showError(
        err?.message || "Failed to search details",
        "Checker Error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className={panelClass}>
        <div className="mb-3 text-lg font-semibold text-slate-900">Checker</div>
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="email"
              checked={searchType === "email"}
              onChange={(event) => setSearchType(event.target.value)}
            />
            <span>Email</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="phone"
              checked={searchType === "phone"}
              onChange={(event) => setSearchType(event.target.value)}
            />
            <span>Phone Number</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-xl">
            <Input
              label={searchType === "email" ? "Student Email" : "Student Phone"}
              placeholder={
                searchType === "email" ? "Enter email" : "Enter phone number"
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      {student ? (
        <div className={panelClass}>
          <div className="text-sm text-slate-500">Student</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {student.full_name || "—"}
          </div>
          <div className="mt-2 grid gap-1 text-sm text-slate-700 md:grid-cols-2">
            <div>Email: {student.email || "—"}</div>
            <div>Phone: {student.phone || "—"}</div>
            <div>Location: {student.location || "—"}</div>
            <div>Eligible: {student.is_eligible ? "Yes" : "No"}</div>
          </div>
        </div>
      ) : null}

      {student ? (
        <div className={panelClass}>
          <div className="mb-3 text-sm text-slate-500">Applied Details</div>
          {applications.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Job</th>
                    <th className="px-2 py-2">Company</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr
                      key={application.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-2 py-2 text-slate-800">
                        {application.job?.title || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {application.job?.company || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {application.status || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {application.created_at
                          ? new Date(
                              application.created_at,
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              No applications found for this student.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
