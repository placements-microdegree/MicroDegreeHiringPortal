import { useMemo } from "react";
import Button from "../common/Button";
import { confirmDanger, showError } from "../../utils/alerts";

function normalizeStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "active") return "Active";
  if (value === "deleted") return "Deleted";
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

function getStatusChipClasses(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "active") return "bg-emerald-100 text-emerald-700";
  if (value === "deleted") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function formatPostedDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function JobListWithDelete({
  jobs,
  onEdit,
  onDelete,
  emptyMessage = "No jobs found.",
}) {
  const sortedJobs = useMemo(
    () =>
      [...(jobs || [])].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      ),
    [jobs],
  );

  const handleDelete = async (job) => {
    const confirmed = await confirmDanger({
      title: "Delete JD",
      text: `Are you sure you want to delete ${job.title} at ${job.company}?`,
      confirmButtonText: "Yes, delete",
    });
    if (!confirmed) return;

    try {
      await onDelete?.(job);
    } catch (err) {
      await showError(err?.message || "Failed to delete JD", "Delete Failed");
    }
  };

  const handleEdit = async (job) => {
    try {
      await onEdit?.(job);
    } catch (err) {
      await showError(err?.message || "Failed to edit JD", "Edit Failed");
    }
  };

  return (
    <div className="space-y-4">
      {sortedJobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              className="group w-full md:w-[calc(50%-0.75rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {job.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">{job.company}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Posted: {formatPostedDate(job.created_at || job.createdAt)}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusChipClasses(job.status)}`}
                  >
                    {normalizeStatus(job.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onEdit ? (
                    <Button
                      variant="outline"
                      className="border-primary/25 text-primary hover:bg-primary/5"
                      onClick={() => handleEdit(job)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(job)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-sm text-slate-700">
                {job.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Location: {job.location || "Location not specified"}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1">
                  CTC: {job.ctc || "CTC not disclosed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
