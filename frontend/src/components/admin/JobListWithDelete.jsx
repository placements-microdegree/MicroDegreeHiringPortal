import { useMemo } from "react";
import Button from "../common/Button";
import { confirmDanger, showError } from "../../utils/alerts";

export default function JobListWithDelete({
  jobs,
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

  return (
    <div className="space-y-4">
      {sortedJobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 max-w-[600px] gap-6 md:grid-cols-2">
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {job.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">{job.company}</p>
                </div>

                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(job)}
                >
                  Delete
                </Button>
              </div>

              {/* Description */}
              <p className="mt-4 line-clamp-3 text-sm text-slate-700">
                {job.description}
              </p>

              {/* Footer */}
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  📍 {job.location || "Location not specified"}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1">
                  💰 {job.ctc || "CTC not disclosed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
