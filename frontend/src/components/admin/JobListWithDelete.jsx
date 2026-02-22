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
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedJobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">{job.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{job.company}</div>
                </div>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(job)}
                >
                  Delete
                </Button>
              </div>
              <div className="mt-3 text-sm text-slate-700">{job.description}</div>
              <div className="mt-3 text-xs text-slate-600">
                {job.location || "-"} | {job.ctc || "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
