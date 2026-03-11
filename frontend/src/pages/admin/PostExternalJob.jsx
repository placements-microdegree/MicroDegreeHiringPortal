// FILE: src/pages/admin/PostExternalJob.jsx
// Route: /admin/external-jobs

import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import {
  listAllExternalJobs,
  createExternalJob,
  updateExternalJob,
  deleteExternalJob,
} from "../../services/externalJobService";
import { showError } from "../../utils/alerts";

const EMPTY_FORM = {
  company:     "",
  jobRole:     "",
  experience:  "",
  ctc:         "",
  location:    "",
  applyLink:   "",
  description: "",
  status:      "active",
};

function FormModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form,    setForm]    = useState(
    isEdit
      ? {
          company:     initial.company     || "",
          jobRole:     initial.job_role    || "",
          experience:  initial.experience  || "",
          ctc:         initial.ctc         || "",
          location:    initial.location    || "",
          applyLink:   initial.apply_link  || "",
          description: initial.description || "",
          status:      initial.status      || "active",
        }
      : { ...EMPTY_FORM },
  );
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const update = (patch) => {
    setForm((p) => ({ ...p, ...patch }));
    const key = Object.keys(patch)[0];
    if (key) setErrors((p) => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.company.trim())   e.company   = "Required";
    if (!form.jobRole.trim())   e.jobRole   = "Required";
    if (!form.applyLink.trim()) e.applyLink = "Required";
    // basic URL check
    try { new URL(form.applyLink.trim()); } catch {
      if (form.applyLink.trim()) e.applyLink = "Must be a valid URL";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      await showError(err?.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit External Job" : "Post External Job"}
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Company + Job Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`mb-1 block text-sm font-medium ${errors.company ? "text-red-600" : "text-slate-700"}`}>
                Company Name <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="e.g. Google"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary ${errors.company ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                value={form.company} onChange={(e) => update({ company: e.target.value })}
              />
              {errors.company && <p className="mt-1 text-xs text-red-600">{errors.company}</p>}
            </div>
            <div>
              <label className={`mb-1 block text-sm font-medium ${errors.jobRole ? "text-red-600" : "text-slate-700"}`}>
                Job Role <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="e.g. Frontend Engineer"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary ${errors.jobRole ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                value={form.jobRole} onChange={(e) => update({ jobRole: e.target.value })}
              />
              {errors.jobRole && <p className="mt-1 text-xs text-red-600">{errors.jobRole}</p>}
            </div>
          </div>

          {/* Experience + CTC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Experience</label>
              <input type="text" placeholder="e.g. 2–4 years"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                value={form.experience} onChange={(e) => update({ experience: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CTC</label>
              <input type="text" placeholder="e.g. 8–12 LPA"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                value={form.ctc} onChange={(e) => update({ ctc: e.target.value })}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input type="text" placeholder="e.g. Bengaluru / Remote"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              value={form.location} onChange={(e) => update({ location: e.target.value })}
            />
          </div>

          {/* Apply Link */}
          <div>
            <label className={`mb-1 block text-sm font-medium ${errors.applyLink ? "text-red-600" : "text-slate-700"}`}>
              Apply Link <span className="text-red-500">*</span>
            </label>
            <input type="url" placeholder="https://careers.company.com/job/..."
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary ${errors.applyLink ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              value={form.applyLink} onChange={(e) => update({ applyLink: e.target.value })}
            />
            {errors.applyLink && <p className="mt-1 text-xs text-red-600">{errors.applyLink}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea rows={3} placeholder="Brief role description..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              value={form.description} onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Update Job" : "Post Job"}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PostExternalJob() {
  const [jobs,       setJobs]       = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [modalJob,   setModalJob]   = useState(null);   // null = closed, {} = new, job obj = edit
  const [modalOpen,  setModalOpen]  = useState(false);
  const [deleting,   setDeleting]   = useState(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await listAllExternalJobs();
      setJobs(data);
    } catch (err) {
      await showError(err?.message || "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openNew  = () => { setModalJob(null);  setModalOpen(true); };
  const openEdit = (job) => { setModalJob(job); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = async (form) => {
    if (modalJob?.id) {
      await updateExternalJob(modalJob.id, form);
    } else {
      await createExternalJob(form);
    }
    await refresh();
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.job_role}" at ${job.company}?`)) return;
    setDeleting(job.id);
    try {
      await deleteExternalJob(job.id);
      await refresh();
    } catch (err) {
      await showError(err?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">External Job Postings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Post external company jobs. Eligible students will see these and can apply directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={isLoading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50">
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90">
            <FiPlus className="h-4 w-4" />
            Post Job
          </button>
        </div>
      </div>

      {/* Jobs table */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
          <p>No external jobs posted yet.</p>
          <button type="button" onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
            <FiPlus className="h-4 w-4" /> Post First Job
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">CTC</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{job.company}</td>
                  <td className="px-4 py-3 text-slate-700">{job.job_role}</td>
                  <td className="px-4 py-3 text-slate-600">{job.experience || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{job.ctc || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{job.location || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      job.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={job.apply_link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      <FiExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(job)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-primary">
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(job)}
                        disabled={deleting === job.id}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {modalOpen && (
        <FormModal
          initial={modalJob}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}