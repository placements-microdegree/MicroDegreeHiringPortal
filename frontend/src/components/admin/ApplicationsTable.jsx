import { APPLICATION_STATUSES } from "../../utils/constants";

export default function ApplicationsTable({ rows, onStatusChange }) {
  const escapeCsv = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const formatAppliedDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const cleanResumeName = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.replace(/\.[^/.]+$/, "");
  };

  const getResumeExportValue = (row) => {
    const resumeLink =
      row?.resumeUrl ||
      row?.selected_resume_url ||
      row?.selectedResumeUrl ||
      "";
    if (resumeLink) return resumeLink;

    const byName = cleanResumeName(row?.resumeName);
    if (byName) return byName;

    const fromSelectedUrl = String(row?.selected_resume_url || "")
      .split("/")
      .pop();
    return cleanResumeName(fromSelectedUrl);
  };

  const handleExport = () => {
    if (!rows?.length) return;

    const firstRow = rows[0] || {};
    const jobName = firstRow.jobTitle || firstRow.jobs?.title || "job";
    const companyName = firstRow.jobs?.company || firstRow.company || "company";
    const fileName = `${slugify(jobName)}-${slugify(companyName)}.csv`;

    const headers = [
      "Date",
      "Email ID",
      "Full Name",
      "Contact Number",
      "Current Location",
      "Total No. of experience",
      "Current CTC",
      "Expected CTC",
      "Notice Period",
      "Resume",
    ];

    const csvRows = rows.map((r) =>
      [
        formatAppliedDate(r.appliedAt),
        r.studentEmail || "",
        r.studentName || "",
        r.studentPhone || "",
        r.studentLocation || "",
        r.relevantExperience ||
          r.relevant_experience ||
          r.totalExperience ||
          "",
        r.currentCTC || "",
        r.expectedCTC || "",
        r.noticePeriod || "Not working / Immediately available",
        getResumeExportValue(r),
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">
          Applications
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!rows?.length}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export
        </button>
      </div>
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
