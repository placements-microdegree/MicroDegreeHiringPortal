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
  Shortlisted: "Screening call Received",
  "Resume Screening Rejected": "Resume Not Matched",
  "Profile Mapped for client": "Mapped to Client",
  "Interview Scheduled": "Interview scheduled",
  Interview: "Interview scheduled",
  "Final Round": "final Round",
  "Client Rejected": "screening Discolified",
  Rejected: "screening Discolified",
  "Position Closed": "Position closed",
  "Job on hold/ position closed": "Position closed",
  Selected: "Placed",
};

const STATUS_COLUMNS = APPLICATION_STATUSES.map(
  (status) => STATUS_ALIASES[status] || status,
).filter((status, index, list) => list.indexOf(status) === index);

const STATUS_LABELS = {
  Applied: "Applied",
  "Resume Not Matched": "Resume Not Matched",
  "Mapped to Client": "Mapped to Client",
  "Screening call Received": "Screening call Received",
  "screening Discolified": "screening Discolified",
  "Interview scheduled": "Interview scheduled",
  "Interview Not Cleared": "Interview Not Cleared",
  "Technical Round": "Technical Round",
  "final Round": "final Round",
  Placed: "Placed",
  "Job on hold": "Job on hold",
  "Position closed": "Position closed",
};

const STATUS_COLORS = {
  Applied: "#2563eb",
  "Resume Not Matched": "#dc2626",
  "Mapped to Client": "#f59e0b",
  "Screening call Received": "#f59e0b",
  "screening Discolified": "#dc2626",
  "Interview scheduled": "#f59e0b",
  "Technical Round": "#f59e0b",
  "final Round": "#f59e0b",
  "Interview Not Cleared": "#dc2626",
  Placed: "#16a34a",
  "Job on hold": "#eab308",
  "Position closed": "#6b7280",
};

const FUNNEL_FLOW_ORDER = [
  "Applied",
  "Resume Not Matched",
  "Mapped to Client",
  "Screening call Received",
  "screening Discolified",
  "Interview scheduled",
  "Technical Round",
  "final Round",
  "Interview Not Cleared",
  "Placed",
];

function getStatusHeaderClasses(status) {
  const classByStatus = {
    Applied: "bg-blue-100 text-blue-900",
    "Resume Not Matched": "bg-red-100 text-red-900",
    "Mapped to Client": "bg-orange-100 text-orange-900",
    "Screening call Received": "bg-orange-100 text-orange-900",
    "screening Discolified": "bg-red-100 text-red-900",
    "Interview scheduled": "bg-orange-100 text-orange-900",
    "Technical Round": "bg-orange-100 text-orange-900",
    "final Round": "bg-orange-100 text-orange-900",
    "Interview Not Cleared": "bg-red-100 text-red-900",
    Placed: "bg-green-100 text-green-900",
    "Job on hold": "bg-yellow-100 text-yellow-900",
    "Position closed": "bg-slate-200 text-slate-800",
  };

  return classByStatus[status] || "bg-slate-100 text-slate-800";
}

function createEmptyStatusCounts() {
  const counts = {};
  STATUS_COLUMNS.forEach((status) => {
    counts[status] = 0;
  });
  return counts;
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
          subStage === "mapped to client" ||
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

  const funnelData = useMemo(() => {
    const statusTotals = totals.statusTotals || {};

    return FUNNEL_FLOW_ORDER.map((status) => ({
      label: STATUS_LABELS[status] || status,
      value:
        status === "Applied"
          ? Number(totals.totalApplications || 0)
          : Number(statusTotals[status] || 0),
      color: STATUS_COLORS[status] || "#2563eb",
    }));
  }, [totals]);

  const funnelMaxValue = useMemo(
    () => Math.max(...funnelData.map((item) => item.value), 0),
    [funnelData],
  );

  const funnelTotalValue = useMemo(
    () => funnelData.reduce((sum, item) => sum + item.value, 0),
    [funnelData],
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
    const rowsHtml = funnelData
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
      <p><strong>Scope:</strong> Pipeline status totals for the current filtered data.</p>

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
            <td style="text-align:right;">${funnelTotalValue}</td>
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
                Placement Distribution Funnel Chart
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
              Data source: filtered pipeline status totals.
            </p>

            <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-start">
              <div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Value: {funnelTotalValue}
                  </div>
                  <div className="space-y-2">
                    {funnelData.map((item) => {
                      const widthPercent =
                        funnelMaxValue > 0
                          ? Math.max(
                              10,
                              Math.round((item.value / funnelMaxValue) * 100),
                            )
                          : 10;

                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>{item.label}</span>
                            <span>{item.value}</span>
                          </div>
                          <div className="flex justify-center">
                            <div
                              className="h-7 rounded-md"
                              style={{
                                width: `${widthPercent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto pr-1">
                <ul className="space-y-2">
                  {funnelData.map((item) => (
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
