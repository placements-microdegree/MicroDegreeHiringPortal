import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { listAllApplications } from "../../services/applicationService";
import { showError } from "../../utils/alerts";

function normalizeLower(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function sortTextAsc(a, b) {
  return String(a).localeCompare(String(b));
}

export default function InterviewMappedCandidates() {
  const [isLoading, setIsLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const refresh = async () => {
    setIsLoading(true);
    try {
      const applications = await listAllApplications();
      const grouped = new Map();

      (Array.isArray(applications) ? applications : []).forEach((app) => {
        const status = normalizeLower(app?.sub_stage || app?.status);
        const stage = normalizeLower(app?.stage);

        if (status !== "profile mapped for client" && stage !== "mapped") {
          return;
        }

        const studentId =
          app?.student_id ||
          app?.student?.id ||
          app?.profiles?.id ||
          app?.student?.student_id ||
          null;
        if (!studentId) return;

        const student = app?.student || app?.profiles || {};
        const companyName =
          app?.job?.company || app?.jobs?.company || app?.company || "-";
        const mappedDate = app?.updated_at || app?.created_at || null;

        const key = String(studentId);
        if (!grouped.has(key)) {
          grouped.set(key, {
            studentId: key,
            email: student?.email || "-",
            studentName: student?.full_name || "-",
            contactNumber: student?.phone || "-",
            companyNamesSet: new Set(),
            mappedDateSet: new Set(),
            companyCount: 0,
            firstMappedAt: mappedDate,
            lastMappedAt: mappedDate,
          });
        }

        const row = grouped.get(key);
        row.companyNamesSet.add(companyName);
        const mappedDateKey = normalizeDateOnly(mappedDate);
        if (mappedDateKey) row.mappedDateSet.add(mappedDateKey);
        row.companyCount += 1;

        const mappedAtMs = new Date(mappedDate || 0).getTime();
        const firstMs = new Date(row.firstMappedAt || 0).getTime();
        const lastMs = new Date(row.lastMappedAt || 0).getTime();

        if (!row.firstMappedAt || mappedAtMs < firstMs)
          row.firstMappedAt = mappedDate;
        if (!row.lastMappedAt || mappedAtMs > lastMs)
          row.lastMappedAt = mappedDate;
      });

      const rows = [...grouped.values()]
        .map((row) => ({
          ...row,
          companyNames: [...row.companyNamesSet].sort((a, b) =>
            String(a).localeCompare(String(b)),
          ),
          mappedDates: [...row.mappedDateSet].sort(sortTextAsc),
        }))
        .sort(
          (a, b) =>
            new Date(b.lastMappedAt || 0).getTime() -
            new Date(a.lastMappedAt || 0).getTime(),
        );

      setAllRows(rows);
    } catch (error) {
      setAllRows([]);
      await showError(
        error?.message || "Failed to load interview mapped candidates",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredRows = useMemo(() => {
    const effectiveFromDate = fromDate || null;
    const effectiveToDate = toDate || null;

    return allRows.filter((row) => {
      const mappedDates = Array.isArray(row.mappedDates) ? row.mappedDates : [];
      if (mappedDates.length === 0) return false;

      const hasDateInRange = mappedDates.some((mappedDate) => {
        if (effectiveFromDate && mappedDate < effectiveFromDate) return false;
        if (effectiveToDate && mappedDate > effectiveToDate) return false;
        return true;
      });

      if (!hasDateInRange) return false;

      return true;
    });
  }, [allRows, fromDate, toDate]);

  const totalCompanyCount = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + Number(row.companyCount || 0), 0),
    [filteredRows],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader label="Loading interview mapped candidates..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Interview Mapped Candidates
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Student-wise list for profiles mapped to client with company names
              and mapped job count.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              From Date
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              To Date
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-sm">
            <thead>
              <tr className="bg-yellow-200 text-slate-900">
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Email ID
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Student Name
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Contact Number
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Company Name (Profile mapped for client)
                </th>
                <th className="border border-slate-300 px-3 py-2 text-center">
                  Company Count (No. of jobs mapped for client)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    className="border border-slate-200 px-4 py-6 text-center text-slate-500"
                    colSpan={5}
                  >
                    No mapped candidates found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.studentId} className="bg-white">
                    <td className="border border-slate-200 px-3 py-2">
                      {row.email}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.studentName}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.contactNumber}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.companyNames.join(", ") || "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.companyCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 ? (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                    Total Rows: {filteredRows.length}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    Total
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {totalCompanyCount}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}
