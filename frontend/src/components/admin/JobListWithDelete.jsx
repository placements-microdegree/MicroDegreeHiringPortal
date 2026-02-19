import { useMemo, useState } from "react";
import Button from "../common/Button";

function JobDeleteConfirmModal({ job, onCancel, onConfirm, deleting }) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-base font-semibold text-slate-900">Delete JD</div>
        <div className="mt-2 text-sm text-slate-700">
          Are you sure you want to delete this JD?
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">{job.title}</div>
          <div className="text-xs text-slate-600">{job.company}</div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 from-red-600 to-red-700 hover:opacity-100"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function JobListWithDelete({
  jobs,
  onDelete,
  emptyMessage = "No jobs found.",
}) {
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const sortedJobs = useMemo(
    () =>
      [...(jobs || [])].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      ),
    [jobs],
  );

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete?.(jobToDelete);
      setJobToDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete JD");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

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
                  onClick={() => setJobToDelete(job)}
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

      <JobDeleteConfirmModal
        job={jobToDelete}
        deleting={deleting}
        onCancel={() => (deleting ? null : setJobToDelete(null))}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
