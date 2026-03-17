import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import * as XLSX from "xlsx";
import Loader from "../../components/common/Loader";
import { listAllApplications } from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { showError } from "../../utils/alerts";
import { APPLICATION_STATUSES } from "../../utils/constants";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function normalizeStage(stage) {
  return String(stage || "")
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

const STATUS_ALIASES = {
  Interview: "Interview Scheduled",
  Selected: "Placed",
};

const STATUS_COLUMNS = APPLICATION_STATUSES.map(
  (status) => STATUS_ALIASES[status] || status,
).filter((status, index, list) => list.indexOf(status) === index);

const STATUS_LABELS = {
  Applied: "Applied",
  Shortlisted: "Shortlisted",
  "Resume Screening Rejected": "Screening Rejected",
  "Profile Mapped for client": "Mapped to Client",
  "Interview Scheduled": "Interview Scheduled",
  "Interview Not Cleared": "Interview Not Cleared",
  "Technical Round": "Technical Round",
  "Final Round": "Final Round",
  Placed: "Placed",
  Rejected: "Rejected",
  "Position Closed": "Position Closed",
  "Client Rejected": "Client Rejected",
};

function getStatusHeaderClasses(status) {
  const greenStatuses = new Set(["Shortlisted", "Placed"]);
  const yellowStatuses = new Set([
    "Applied",
    "Profile Mapped for client",
    "Interview Scheduled",
    "Technical Round",
    "Final Round",
  ]);

  if (greenStatuses.has(status)) {
    return "bg-green-100 text-green-900";
  }

  if (yellowStatuses.has(status)) {
    return "bg-yellow-100 text-yellow-900";
  }

  return "bg-red-100 text-red-900";
}

function createEmptyStatusCounts() {
  const counts = {};
  STATUS_COLUMNS.forEach((status) => {
    counts[status] = 0;
  });
  return counts;
}

function buildPieGradient(data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "conic-gradient(#e2e8f0 0deg 360deg)";

  let cumulative = 0;
  const segments = data
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = cumulative;
      const sweep = (item.value / total) * 360;
      const end = start + sweep;
      cumulative = end;
      return `${item.color} ${start}deg ${end}deg`;
    });

  if (segments.length === 0) return "conic-gradient(#e2e8f0 0deg 360deg)";
  return `conic-gradient(${segments.join(", ")})`;
}

export default function PlacementMasterDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isChartOpen, setIsChartOpen] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [jobs, applications] = await Promise.all([
        listJobs({ includeClosed: true }),
        listAllApplications(),
      ]);

      const jobsById = new Map(
        (Array.isArray(jobs) ? jobs : []).map((job) => [String(job.id), job]),
      );

      const grouped = new Map();

      (Array.isArray(applications) ? applications : []).forEach((app) => {
        const jobId =
          app?.job_id ||
          app?.jobId ||
          app?.job?.id ||
          app?.jobs?.id ||
          app?.job?.job_id ||
          null;

        if (!jobId) return;

        const key = String(jobId);
        const job = jobsById.get(key) || app?.job || app?.jobs || null;
        if (!grouped.has(key)) {
          grouped.set(key, {
            jobId: key,
            date: job?.created_at || job?.createdAt || app?.created_at || null,
            company: job?.company || "-",
            role: job?.title || "-",
            location: job?.location || "-",
            totalApplications: 0,
            appliedByStudents: 0,
            mappedFromDashboard: 0,
            sharedWithClient: 0,
            statusCounts: createEmptyStatusCounts(),
          });
        }

        const row = grouped.get(key);
        const subStageRaw = String(
          app?.sub_stage || app?.status || "Applied",
        ).trim();
        const subStage = normalizeStatus(subStageRaw);
        const statusLabel = STATUS_ALIASES[subStageRaw] || subStageRaw;
        const stage = normalizeStage(app?.stage);

        row.totalApplications += 1;

        if (Object.hasOwn(row.statusCounts, statusLabel)) {
          row.statusCounts[statusLabel] += 1;
        }

        if (app?.is_applied_on_behalf === true) {
          row.mappedFromDashboard += 1;
        } else {
          row.appliedByStudents += 1;
        }

        if (
          subStage === "profile mapped for client" ||
          ["mapped", "interview", "final", "closed"].includes(stage)
        ) {
          row.sharedWithClient += 1;
        }
      });

      const normalizedRows = [...grouped.values()].sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      );

      setRows(normalizedRows);
    } catch (error) {
      setRows([]);
      await showError(error?.message || "Failed to load placement pipeline");
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

    return rows.filter((row) => {
      const rowDate = normalizeDateOnly(row.date);
      if (!rowDate) return false;
      if (effectiveFromDate && rowDate < effectiveFromDate) return false;
      if (effectiveToDate && rowDate > effectiveToDate) return false;
      return true;
    });
  }, [rows, fromDate, toDate]);

  const totals = useMemo(() => {
    const statusTotals = createEmptyStatusCounts();

    return filteredRows.reduce(
      (acc, row) => {
        acc.totalApplications += row.totalApplications;
        acc.appliedByStudents += row.appliedByStudents;
        acc.mappedFromDashboard += row.mappedFromDashboard;
        acc.sharedWithClient += row.sharedWithClient;
        STATUS_COLUMNS.forEach((status) => {
          statusTotals[status] += Number(row.statusCounts?.[status] || 0);
        });
        acc.statusTotals = statusTotals;
        return acc;
      },
      {
        totalApplications: 0,
        appliedByStudents: 0,
        mappedFromDashboard: 0,
        sharedWithClient: 0,
        statusTotals,
      },
    );
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const values = [
      {
        label: "Total Applications",
        value: Number(totals.totalApplications || 0),
        color: "#f59e0b",
      },
      {
        label: "Applied by Students",
        value: Number(totals.appliedByStudents || 0),
        color: "#14b8a6",
      },
      {
        label: "Mapped via Dashboard",
        value: Number(totals.mappedFromDashboard || 0),
        color: "#6366f1",
      },
      {
        label: "Shared with Client",
        value: Number(totals.sharedWithClient || 0),
        color: "#166534",
      },
      {
        label: "Applied",
        value: Number(totals.statusTotals?.Applied || 0),
        color: "#facc15",
      },
      {
        label: "Shortlisted",
        value: Number(totals.statusTotals?.Shortlisted || 0),
        color: "#22c55e",
      },
      {
        label: "Screening Rejected",
        value: Number(totals.statusTotals?.["Resume Screening Rejected"] || 0),
        color: "#f97316",
      },
      {
        label: "Mapped to Client",
        value: Number(totals.statusTotals?.["Profile Mapped for client"] || 0),
        color: "#eab308",
      },
      {
        label: "Interview Scheduled",
        value: Number(totals.statusTotals?.["Interview Scheduled"] || 0),
        color: "#0ea5e9",
      },
      {
        label: "Interview Not Cleared",
        value: Number(totals.statusTotals?.["Interview Not Cleared"] || 0),
        color: "#ef4444",
      },
      {
        label: "Technical Round",
        value: Number(totals.statusTotals?.["Technical Round"] || 0),
        color: "#3b82f6",
      },
      {
        label: "Final Round",
        value: Number(totals.statusTotals?.["Final Round"] || 0),
        color: "#8b5cf6",
      },
      {
        label: "Placed",
        value: Number(totals.statusTotals?.Placed || 0),
        color: "#16a34a",
      },
      {
        label: "Rejected",
        value: Number(totals.statusTotals?.Rejected || 0),
        color: "#dc2626",
      },
    ];

    return values;
  }, [totals]);

  const pieGradient = useMemo(() => buildPieGradient(chartData), [chartData]);
  const pieTotalValue = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  const exportFilteredTable = () => {
    if (filteredRows.length === 0) {
      showError("No filtered table data available to export");
      return;
    }

    const exportRows = filteredRows.map((row) => {
      const baseRow = {
        "Posted On": formatDate(row.date),
        "Client Company": row.company,
        "Job Role": row.role,
        "Job Location": row.location,
        "Total Applications": row.totalApplications,
        "Applied by Students": row.appliedByStudents,
        "Mapped via Dashboard": row.mappedFromDashboard,
        "Shared with Client": row.sharedWithClient,
      };

      STATUS_COLUMNS.forEach((status) => {
        const key = `Status - ${STATUS_LABELS[status] || status}`;
        baseRow[key] = Number(row.statusCounts?.[status] || 0);
      });

      return baseRow;
    });

    const totalsRow = {
      "Posted On": "TOTAL",
      "Client Company": "-",
      "Job Role": "-",
      "Job Location": "-",
      "Total Applications": totals.totalApplications,
      "Applied by Students": totals.appliedByStudents,
      "Mapped via Dashboard": totals.mappedFromDashboard,
      "Shared with Client": totals.sharedWithClient,
    };

    STATUS_COLUMNS.forEach((status) => {
      const key = `Status - ${STATUS_LABELS[status] || status}`;
      totalsRow[key] = Number(totals.statusTotals?.[status] || 0);
    });

    const worksheet = XLSX.utils.json_to_sheet([...exportRows, totalsRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Dashboard");

    const fromText = fromDate || "all";
    const toText = toDate || "all";
    const fileName = `master-dashboard-filtered-${fromText}-to-${toText}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const downloadChartPdf = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      showError("Please allow popups to download PDF report");
      return;
    }

    const reportDate = new Date().toLocaleString("en-IN");
    const dateRangeLabel = `${fromDate || "Start"} to ${toDate || "End"}`;
    const rowsHtml = chartData
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #cbd5e1;">${item.label}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;">${item.value}</td>
          </tr>
        `,
      )
      .join("");

    const doc = popup.document;
    doc.open();
    doc.close();
    doc.title = "Placement Master Dashboard Chart Report";
    doc.head.innerHTML = `
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
        h1 { margin: 0 0 8px 0; font-size: 22px; }
        p { margin: 4px 0; font-size: 13px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #e2e8f0; text-align: left; padding: 8px; border: 1px solid #cbd5e1; }
        .total-row td { font-weight: 700; background: #f8fafc; }
      </style>
    `;
    doc.body.innerHTML = `
      <h1>Placement Distribution Report</h1>
      <p><strong>Generated At:</strong> ${reportDate}</p>
      <p><strong>Date Filter:</strong> ${dateRangeLabel}</p>
      <p><strong>Scope:</strong> Totals from Total Applications to Rejected</p>

      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th style="text-align:right;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row">
            <td>Total Value</td>
            <td style="text-align:right;">${pieTotalValue}</td>
          </tr>
        </tbody>
      </table>
    `;
    popup.focus();
    popup.print();
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader label="Loading master dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Placement Status Pipeline - Master Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Number of candidates mapped from dashboard is counted from
              applications created via Apply on behalf.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportFilteredTable}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiDownload className="h-4 w-4" />
              Export Table
            </button>
            <button
              type="button"
              onClick={() => setIsChartOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Generate Chart
            </button>
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
          <table className="w-full min-w-275 border-collapse text-sm">
            <thead>
              <tr className="text-slate-900">
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-yellow-100 px-3 py-2 text-left"
                >
                  Posted On
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-yellow-100 px-3 py-2 text-left"
                >
                  Client Company
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-yellow-100 px-3 py-2 text-left"
                >
                  Job Role
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-yellow-100 px-3 py-2 text-left"
                >
                  Job Location
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-green-100 px-3 py-2 text-center text-green-900"
                >
                  Total Applications
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-green-100 px-3 py-2 text-center text-green-900"
                >
                  Applied by Students
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-green-100 px-3 py-2 text-center text-green-900"
                >
                  Mapped via Dashboard
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 bg-green-700 px-3 py-2 text-center text-white"
                >
                  Shared with Client
                </th>
                <th
                  colSpan={STATUS_COLUMNS.length}
                  className="border border-slate-300 bg-red-100 px-3 py-2 text-center text-red-900"
                >
                  Pipeline Status Counts
                </th>
              </tr>
              <tr>
                {STATUS_COLUMNS.map((status) => (
                  <th
                    key={status}
                    className={`border border-slate-300 px-3 py-2 text-center ${getStatusHeaderClasses(status)}`}
                  >
                    {STATUS_LABELS[status] || status}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    className="border border-slate-200 px-4 py-6 text-center text-slate-500"
                    colSpan={8 + STATUS_COLUMNS.length}
                  >
                    No placement pipeline data available.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.jobId} className="bg-white">
                    <td className="border border-slate-200 px-3 py-2">
                      {formatDate(row.date)}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.company}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.role}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {row.location}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.totalApplications}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.appliedByStudents}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.mappedFromDashboard}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.sharedWithClient}
                    </td>
                    {STATUS_COLUMNS.map((status) => (
                      <td
                        key={`${row.jobId}-${status}`}
                        className="border border-slate-200 px-3 py-2 text-center"
                      >
                        {row.statusCounts?.[status] || 0}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 ? (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="border border-slate-300 px-3 py-2" colSpan={4}>
                    Total
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {totals.totalApplications}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {totals.appliedByStudents}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {totals.mappedFromDashboard}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {totals.sharedWithClient}
                  </td>
                  {STATUS_COLUMNS.map((status) => (
                    <td
                      key={`totals-${status}`}
                      className="border border-slate-300 px-3 py-2 text-center"
                    >
                      {totals.statusTotals?.[status] || 0}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {isChartOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Placement Distribution Pie Chart
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadChartPdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <FiDownload className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsChartOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Close
                </button>
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Data source: filtered totals from Total Applications to Rejected.
            </p>

            <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-start">
              <div className="mx-auto">
                <div
                  className="relative h-56 w-56 rounded-full"
                  style={{ background: pieGradient }}
                >
                  <div className="absolute inset-10 flex items-center justify-center rounded-full bg-white text-center">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total Value
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {pieTotalValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto pr-1">
                <ul className="space-y-2">
                  {chartData.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
