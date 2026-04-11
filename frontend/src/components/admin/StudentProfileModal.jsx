import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "../common/Modal";
import Button from "../common/Button";

const CLOUD_DRIVE_STATUS_OPTIONS = [
  "",
  "Registered",
  "Not Cleared",
  "Cleared",
  "Practical Online Task Round Cleared",
  "Practical Online Task Round Rejected",
  "Face-to-Face Round (Live Interview) Cleared",
  "Face-to-Face Round (Live Interview) Rejected",
  "Managerial Round Cleared",
  "Managerial Round Rejected",
  "Cleared AWS Drive",
  "Cleared DevOps Drive",
  "Not Attended drive",
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-slate-900">{value || "-"}</div>
    </div>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

InfoRow.defaultProps = {
  value: "-",
};

export default function StudentProfileModal({
  open,
  onClose,
  student,
  appliedJobs = [],
  saving,
  onSave,
}) {
  const [historyRows, setHistoryRows] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftRow, setDraftRow] = useState({ status: "", date: "" });
  const [initialHistorySnapshot, setInitialHistorySnapshot] = useState("[]");
  const closeConfirmToastIdRef = useRef(null);

  useEffect(() => {
    if (!open || !student) return;

    const existingHistory = Array.isArray(student.cloudDriveHistory)
      ? student.cloudDriveHistory
      : [];

    let normalized;

    if (existingHistory.length) {
      normalized = existingHistory
        .filter((item) => item?.status || item?.date)
        .map((item) => ({
          status: String(item?.status || ""),
          date: String(item?.date || ""),
        }));
    } else if (student.cloudDriveStatus || student.driveClearedDate) {
      normalized = [
        {
          status: String(student.cloudDriveStatus || ""),
          date: String(student.driveClearedDate || ""),
        },
      ];
    } else {
      normalized = [{ status: "", date: "" }];
    }

    setHistoryRows(normalized);
    setInitialHistorySnapshot(JSON.stringify(normalized));
    setIsAdding(false);
    setEditingIndex(null);
    setDraftRow({ status: "", date: "" });

    if (closeConfirmToastIdRef.current) {
      toast.dismiss(closeConfirmToastIdRef.current);
      closeConfirmToastIdRef.current = null;
    }
  }, [open, student]);

  useEffect(() => {
    return () => {
      if (closeConfirmToastIdRef.current) {
        toast.dismiss(closeConfirmToastIdRef.current);
      }
    };
  }, []);

  const cloudDriveHistory = useMemo(() => {
    const byDate = new Map();
    historyRows.forEach((row) => {
      const status = String(row?.status || "").trim();
      const date = String(row?.date || "").trim();
      if (!status || !date) return;
      byDate.set(date, { status, date });
    });
    return [...byDate.values()].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );
  }, [historyRows]);

  const hasDraftChanges = useMemo(() => {
    if (isAdding) {
      return Boolean(
        String(draftRow.status || "").trim() ||
          String(draftRow.date || "").trim(),
      );
    }

    if (editingIndex !== null && editingIndex !== undefined) {
      const source = historyRows[editingIndex] || { status: "", date: "" };
      return (
        String(source.status || "") !== String(draftRow.status || "") ||
        String(source.date || "") !== String(draftRow.date || "")
      );
    }

    return false;
  }, [isAdding, editingIndex, draftRow, historyRows]);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(historyRows) !== initialHistorySnapshot || hasDraftChanges
    );
  }, [historyRows, initialHistorySnapshot, hasDraftChanges]);

  const handleSave = () => {
    onSave?.({ cloudDriveHistory });
  };

  const dismissCloseConfirmToast = () => {
    if (closeConfirmToastIdRef.current) {
      toast.dismiss(closeConfirmToastIdRef.current);
      closeConfirmToastIdRef.current = null;
    }
  };

  const showCloseConfirmToast = () => {
    if (closeConfirmToastIdRef.current) return;

    const toastId = toast.warn(
      <div className="space-y-2">
        <div className="text-sm font-semibold">Unsaved changes will be lost.</div>
        <div className="text-xs text-slate-700">
          Save changes, discard changes, or continue editing.
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              dismissCloseConfirmToast();
              handleSave();
            }}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              dismissCloseConfirmToast();
              onClose?.();
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={dismissCloseConfirmToast}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Continue Editing
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );

    closeConfirmToastIdRef.current = toastId;
  };

  const attemptClose = () => {
    if (!isDirty || saving) {
      onClose?.();
      return;
    }
    showCloseConfirmToast();
  };

  const removeHistoryRow = (index) => {
    setHistoryRows((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setDraftRow({ status: "", date: "" });
    }
  };

  const startAddEntry = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setDraftRow({ status: "", date: "" });
  };

  const cancelAddEntry = () => {
    setIsAdding(false);
    setDraftRow({ status: "", date: "" });
  };

  const saveAddEntry = () => {
    const status = String(draftRow.status || "").trim();
    const date = String(draftRow.date || "").trim();
    if (!status || !date) return;

    setHistoryRows((prev) => {
      const withoutSameDate = prev.filter(
        (row) => String(row.date || "") !== date,
      );
      return [...withoutSameDate, { status, date }];
    });
    setIsAdding(false);
    setDraftRow({ status: "", date: "" });
  };

  const startEditEntry = (index) => {
    const row = historyRows[index];
    if (!row) return;
    setEditingIndex(index);
    setIsAdding(false);
    setDraftRow({ status: row.status || "", date: row.date || "" });
  };

  const cancelEditEntry = () => {
    setEditingIndex(null);
    setDraftRow({ status: "", date: "" });
  };

  const saveEditEntry = () => {
    if (editingIndex === null || editingIndex === undefined) return;
    const status = String(draftRow.status || "").trim();
    const date = String(draftRow.date || "").trim();
    if (!status || !date) return;

    setHistoryRows((prev) => {
      const next = prev
        .filter((_, idx) => idx === editingIndex || String(prev[idx]?.date || "") !== date)
        .map((row, idx) => (idx === editingIndex ? { status, date } : row));
      return next;
    });
    setEditingIndex(null);
    setDraftRow({ status: "", date: "" });
  };

  return (
    <Modal
      title="Student Profile"
      open={open}
      onClose={attemptClose}
      maxWidthClass="max-w-[980px]"
      scrollable
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={attemptClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      {!student ? null : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Name" value={student.fullName || "Student"} />
            <InfoRow label="Email" value={student.email || "-"} />
            <InfoRow label="Phone" value={student.phone || "-"} />
            <InfoRow label="Location" value={student.location || "-"} />
            <InfoRow
              label="Preferred Location"
              value={student.preferredLocation || "-"}
            />
            <InfoRow
              label="Eligibility"
              value={
                student.isEligible
                  ? `Eligible${
                      student.eligibleUntil
                        ? ` until ${formatDate(student.eligibleUntil)}`
                        : ""
                    }`
                  : "Not eligible"
              }
            />
            <InfoRow label="Current CTC (LPA)" value={student.currentCtc ?? "-"} />
            <InfoRow label="Expected CTC (LPA)" value={student.expectedCtc ?? "-"} />
            <InfoRow label="Total Experience" value={student.totalExperience ?? "-"} />
            <InfoRow
              label="Skills"
              value={
                Array.isArray(student.skills)
                  ? student.skills.join(", ")
                  : student.skills || "-"
              }
            />
            <InfoRow label="Experience Level" value={student.experienceLevel || "-"} />
            <InfoRow
              label="Last Updated"
              value={
                student.updatedAt
                  ? new Date(student.updatedAt).toLocaleString()
                  : "-"
              }
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Student Applied Jobs
              </div>
              <div className="text-xs text-slate-500">
                {appliedJobs.length} application{appliedJobs.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Job Title</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliedJobs.length ? (
                      appliedJobs.map((job, index) => (
                        <tr
                          key={`${job.jobId || "job"}-${job.applicationId || index}`}
                          className="border-t border-slate-200"
                        >
                          <td className="px-3 py-2 text-slate-700">{job.company || "-"}</td>
                          <td className="px-3 py-2 text-slate-900">{job.title || "-"}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {job.status || "Applied"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatDateTime(job.appliedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                          No applications found for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Cloud Drive Status History
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={startAddEntry}
                disabled={isAdding}
              >
                Add Entry
              </Button>
            </div>

            <div className="space-y-2">
              {isAdding ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2">
                  <div className="grid gap-2 md:grid-cols-12">
                    <label className="block md:col-span-6">
                      <div className="mb-1 text-xs font-medium text-slate-700">Status</div>
                      <select
                        value={draftRow.status}
                        onChange={(event) =>
                          setDraftRow((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Select status</option>
                        {CLOUD_DRIVE_STATUS_OPTIONS.filter(Boolean).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block md:col-span-4">
                      <div className="mb-1 text-xs font-medium text-slate-700">Date</div>
                      <input
                        type="date"
                        value={draftRow.date}
                        onChange={(event) =>
                          setDraftRow((prev) => ({
                            ...prev,
                            date: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <div className="flex items-end gap-2 md:col-span-2">
                      <Button type="button" variant="outline" onClick={saveAddEntry}>
                        Add
                      </Button>
                      <Button type="button" variant="subtle" onClick={cancelAddEntry}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {historyRows.map((row, index) => (
                <div
                  key={`history-row-${index}`}
                  className="rounded-lg border border-slate-200 p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-slate-900">
                      {row.date || "-"} - {row.status || "-"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditEntry(index)}
                        className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        aria-label="Edit history entry"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHistoryRow(index)}
                        className="inline-flex items-center rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        aria-label="Delete history entry"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingIndex === index ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-12">
                      <label className="block md:col-span-6">
                        <div className="mb-1 text-xs font-medium text-slate-700">Status</div>
                        <select
                          value={draftRow.status}
                          onChange={(event) =>
                            setDraftRow((prev) => ({
                              ...prev,
                              status: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Select status</option>
                          {CLOUD_DRIVE_STATUS_OPTIONS.filter(Boolean).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block md:col-span-4">
                        <div className="mb-1 text-xs font-medium text-slate-700">Date</div>
                        <input
                          type="date"
                          value={draftRow.date}
                          onChange={(event) =>
                            setDraftRow((prev) => ({
                              ...prev,
                              date: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <div className="flex items-end gap-2 md:col-span-2">
                        <Button type="button" variant="outline" onClick={saveEditEntry}>
                          Save
                        </Button>
                        <Button type="button" variant="subtle" onClick={cancelEditEntry}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </Modal>
  );
}

StudentProfileModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  student: PropTypes.shape({
    id: PropTypes.string,
    fullName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    location: PropTypes.string,
    preferredLocation: PropTypes.string,
    isEligible: PropTypes.bool,
    eligibleUntil: PropTypes.string,
    currentCtc: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    expectedCtc: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    totalExperience: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    skills: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string,
    ]),
    experienceLevel: PropTypes.string,
    updatedAt: PropTypes.string,
    cloudDriveStatus: PropTypes.string,
    driveClearedDate: PropTypes.string,
    cloudDriveHistory: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
        date: PropTypes.string,
      }),
    ),
    driveClearedStatus: PropTypes.arrayOf(PropTypes.string),
  }),
  appliedJobs: PropTypes.arrayOf(
    PropTypes.shape({
      applicationId: PropTypes.string,
      jobId: PropTypes.string,
      company: PropTypes.string,
      title: PropTypes.string,
      status: PropTypes.string,
      appliedAt: PropTypes.string,
    }),
  ),
  saving: PropTypes.bool,
  onSave: PropTypes.func,
};

StudentProfileModal.defaultProps = {
  open: false,
  onClose: undefined,
  student: null,
  appliedJobs: [],
  saving: false,
  onSave: undefined,
};
