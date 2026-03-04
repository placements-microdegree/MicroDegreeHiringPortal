import { useEffect, useState } from "react";
import { listAllApplications } from "../../services/applicationService";
import { deleteJob, listJobs, updateJob } from "../../services/jobService";
import Modal from "../../components/common/Modal";
import JDForm from "../../components/admin/JDForm";
import JobListWithDelete from "../../components/admin/JobListWithDelete";
import { showError, showSuccess } from "../../utils/alerts";

export default function AdminDashboard() {
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [editingJob, setEditingJob] = useState(null);

  const refreshDashboard = async () => {
    const [listedJobs, apps] = await Promise.all([
      listJobs(),
      listAllApplications(),
    ]);
    setJobs(listedJobs);
    setJobCount(listedJobs.length);
    setAppCount(apps.length);
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const onDeleteJob = async (job) => {
    await deleteJob(job.id);
    await refreshDashboard();
    await showSuccess("JD deleted successfully.");
  };

  const onStartEdit = (job) => {
    setEditingJob(job);
  };

  const onCloseEdit = () => {
    setEditingJob(null);
  };

  const onUpdateJob = async (payload) => {
    if (!editingJob?.id) return;

    try {
      await updateJob(editingJob.id, payload);
      await refreshDashboard();
      await showSuccess("JD updated successfully.");
      onCloseEdit();
    } catch (err) {
      await showError(err?.message || "Failed to update JD", "Update Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">
            Posted Jobs
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {jobCount}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">
            Applications
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {appCount}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4">
        <div className="text-base font-semibold text-slate-900">Posted JDs</div>
        <div className="mt-4">
          <JobListWithDelete
            jobs={jobs}
            onEdit={onStartEdit}
            onDelete={onDeleteJob}
            emptyMessage="No posted JDs yet."
          />
        </div>
      </div>

      <Modal
        title="Edit JD"
        open={Boolean(editingJob)}
        onClose={onCloseEdit}
        maxWidthClass="max-w-[980px]"
        scrollable
      >
        <JDForm
          initialValues={editingJob}
          onSubmit={onUpdateJob}
          title="Edit Job Description"
          submitLabel="Update JD"
          savingLabel="Updating..."
          onCancel={onCloseEdit}
          resetOnSuccess={false}
        />
      </Modal>
    </div>
  );
}
