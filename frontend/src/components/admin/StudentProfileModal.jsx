import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { getStudentResumesForHR } from "../../services/applicationService";

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

const JOB_SEARCH_STATUS_OPTIONS = [
  "ACTIVE_NOW",
  "PASSIVE",
  "NOT_LOOKING",
  "UNRESPONSIVE",
];

const INTERNAL_FLAG_OPTIONS = ["RED_FLAG", "ON_HOLD", "BLACKLISTED"];

const RESUME_APPROVAL_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

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

function getResumeOptionLabel(resume, index) {
  const fileName = String(resume?.file_name || "").trim();
  const approvalStatus = String(resume?.approval_status || "PENDING").trim();
  const createdAt = formatDate(resume?.created_at);
  return `${fileName || `Resume ${index + 1}`} (${approvalStatus})${createdAt !== "-" ? ` - ${createdAt}` : ""}`;
}

function normalizeResumeOption(resume) {
  return {
    id: resume?.id || null,
    file_name: resume?.file_name || null,
    approval_status: resume?.approval_status || "PENDING",
    rejection_reason: resume?.rejection_reason || "",
    approved_at: resume?.approved_at || null,
    created_at: resume?.created_at || null,
    signed_url: resume?.signed_url || null,
    file_url: resume?.file_url || null,
  };
}

function getResumeSortTime(resume) {
  return new Date(resume?.approved_at || resume?.created_at || 0).getTime();
}

function sortResumeOptions(resumes = []) {
  return [...resumes].sort((a, b) => getResumeSortTime(b) - getResumeSortTime(a));
}

function buildResumeUpdatesSnapshot(resumes = [], reasonDraftByResumeId = {}) {
  return resumes.map((resume) => ({
    id: String(resume?.id || "").trim(),
    approval_status: String(resume?.approval_status || "PENDING")
      .trim()
      .toUpperCase(),
    rejection_reason: String(
      reasonDraftByResumeId[String(resume?.id || "").trim()] ??
        resume?.rejection_reason ??
        "",
    ).trim(),
  }));
}

function getInternalFlagClasses(flag, selected) {
  const byFlag = {
    RED_FLAG: selected
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
    ON_HOLD: selected
      ? "border-sky-300 bg-sky-50 text-sky-700"
      : "border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    BLACKLISTED: selected
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };

  return (
    byFlag[flag] ||
    (selected
      ? "border-primary bg-primary/10 text-primary"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
  );
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
  const [initialSupportSnapshot, setInitialSupportSnapshot] = useState("{}");
  const [jobSearchStatus, setJobSearchStatus] = useState("PASSIVE");
  const [internalFlags, setInternalFlags] = useState([]);
  const [internalNote, setInternalNote] = useState("");
  const [editingInternalNoteId, setEditingInternalNoteId] = useState("");
  const [activeResumeId, setActiveResumeId] = useState("");
  const [activeResumeApprovalStatus, setActiveResumeApprovalStatus] =
    useState("");
  const [activeResumeRejectionReason, setActiveResumeRejectionReason] =
    useState("");
  const [resumeOptions, setResumeOptions] = useState([]);
  const [reasonDraftByResumeId, setReasonDraftByResumeId] = useState({});
  const [reasonEditingByResumeId, setReasonEditingByResumeId] = useState({});
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumeLoadError, setResumeLoadError] = useState("");
  const closeConfirmToastIdRef = useRef(null);

  const getResumeKey = (resumeId) => String(resumeId || "").trim();

  const resetReasonEditorState = (resumes = []) => {
    const drafts = {};
    resumes.forEach((resume) => {
      const key = getResumeKey(resume?.id);
      if (!key) return;
      drafts[key] = String(resume?.rejection_reason || "");
    });
    setReasonDraftByResumeId(drafts);
    setReasonEditingByResumeId({});
  };

  const findResumeById = (resumeId, resumes = resumeOptions) => {
    const normalizedResumeId = String(resumeId || "").trim();
    if (!normalizedResumeId) return resumes[0] || null;
    return (
      resumes.find(
        (resume) => String(resume?.id || "").trim() === normalizedResumeId,
      ) || null
    );
  };

  const syncResumeFields = (resumeId, resumes = resumeOptions) => {
    const resume = findResumeById(resumeId, resumes);
    setActiveResumeId(String(resume?.id || resumeId || "").trim());
    setActiveResumeApprovalStatus(
      String(resume?.approval_status || "PENDING").trim().toUpperCase(),
    );
    setActiveResumeRejectionReason(
      String(resume?.rejection_reason || "").trim(),
    );
    return resume;
  };

  const updateResumeOption = (resumeId, patch) => {
    setResumeOptions((prev) => {
      const next = prev.map((resume) =>
        String(resume?.id || "") === String(resumeId || "")
          ? { ...resume, ...patch }
          : resume,
      );
      const selectedResume = findResumeById(activeResumeId, next);
      setActiveResumeApprovalStatus(
        String(selectedResume?.approval_status || "PENDING")
          .trim()
          .toUpperCase(),
      );
      setActiveResumeRejectionReason(
        String(selectedResume?.rejection_reason || "").trim(),
      );
      return next;
    });
  };

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

    const initialFlags = Array.isArray(student.internalFlags)
      ? student.internalFlags
      : [];
    const latestInternalNote = Array.isArray(student.internalNotes)
      ? student.internalNotes[0] || null
      : null;
    const initialResumes = Array.isArray(student.resumesMeta)
      ? sortResumeOptions(student.resumesMeta.map(normalizeResumeOption))
      : [];
    const initialActiveResume =
      findResumeById(student.activeResumeId, initialResumes) ||
      initialResumes[0] ||
      null;
    const initialSupport = {
      jobSearchStatus: student.jobSearchStatus || "PASSIVE",
      internalFlags: initialFlags,
      editingInternalNoteId: String(latestInternalNote?.id || "").trim(),
      internalNote: String(latestInternalNote?.note || "").trim(),
      activeResumeId: String(
        initialActiveResume?.id || student.activeResumeId || "",
      ).trim(),
      resumeUpdates: buildResumeUpdatesSnapshot(initialResumes),
    };

    setResumeOptions(initialResumes);
    resetReasonEditorState(initialResumes);
    setResumesLoading(false);
    setResumeLoadError("");
    setJobSearchStatus(initialSupport.jobSearchStatus);
    setInternalFlags(initialSupport.internalFlags);
    setInternalNote(initialSupport.internalNote);
    setEditingInternalNoteId(initialSupport.editingInternalNoteId);
    setActiveResumeId(initialSupport.activeResumeId);
    syncResumeFields(initialSupport.activeResumeId, initialResumes);
    setInitialSupportSnapshot(JSON.stringify(initialSupport));

    if (closeConfirmToastIdRef.current) {
      toast.dismiss(closeConfirmToastIdRef.current);
      closeConfirmToastIdRef.current = null;
    }
  }, [open, student]);

  useEffect(() => {
    if (!open || !student?.id) return undefined;

    let active = true;

    const loadResumes = async () => {
      setResumesLoading(true);
      setResumeLoadError("");
      try {
        const rows = await getStudentResumesForHR(student.id);
        if (!active) return;

        const normalizedRows = Array.isArray(rows)
          ? sortResumeOptions(rows.map(normalizeResumeOption))
          : [];

        const selectedResume =
          findResumeById(student.activeResumeId, normalizedRows) ||
          normalizedRows[0] ||
          null;
        const nextActiveResumeId = String(selectedResume?.id || "").trim();

        setResumeOptions(normalizedRows);
        resetReasonEditorState(normalizedRows);
        syncResumeFields(nextActiveResumeId, normalizedRows);
        setInitialSupportSnapshot(
          JSON.stringify({
            jobSearchStatus: student.jobSearchStatus || "PASSIVE",
            internalFlags: Array.isArray(student.internalFlags)
              ? student.internalFlags
              : [],
            editingInternalNoteId: String(student.internalNotes?.[0]?.id || "").trim(),
            internalNote: String(student.internalNotes?.[0]?.note || "").trim(),
            activeResumeId: nextActiveResumeId || "",
            resumeUpdates: buildResumeUpdatesSnapshot(normalizedRows),
          }),
        );
      } catch (error) {
        if (!active) return;
        setResumeLoadError(
          error?.message || "Failed to load latest student resumes",
        );
      } finally {
        if (active) setResumesLoading(false);
      }
    };

    loadResumes();

    return () => {
      active = false;
    };
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
    const currentSupportSnapshot = JSON.stringify({
      jobSearchStatus,
      internalFlags,
      internalNote: String(internalNote || "").trim(),
      editingInternalNoteId,
      activeResumeId,
      resumeUpdates: buildResumeUpdatesSnapshot(
        resumeOptions,
        reasonDraftByResumeId,
      ),
    });

    return (
      JSON.stringify(historyRows) !== initialHistorySnapshot ||
      currentSupportSnapshot !== initialSupportSnapshot ||
      hasDraftChanges
    );
  }, [
    historyRows,
    initialHistorySnapshot,
    hasDraftChanges,
    jobSearchStatus,
    internalFlags,
    internalNote,
    editingInternalNoteId,
    activeResumeId,
    resumeOptions,
    reasonDraftByResumeId,
    initialSupportSnapshot,
  ]);

  const handleSave = () => {
    const resumeUpdates = buildResumeUpdatesSnapshot(
      resumeOptions,
      reasonDraftByResumeId,
    );
    const activeResumeUpdate =
      resumeUpdates.find(
        (resume) => resume.id === String(activeResumeId || "").trim(),
      ) || null;

    onSave?.({
      cloudDriveHistory,
      jobSearchStatus,
      internalFlags,
      internalNote,
      internalNoteId: editingInternalNoteId || null,
      activeResumeId,
      activeResumeApprovalStatus,
      activeResumeRejectionReason:
        activeResumeUpdate?.rejection_reason ?? activeResumeRejectionReason,
      resumeUpdates,
    });
  };

  const toggleInternalFlag = (flag) => {
    setInternalFlags((prev) => {
      if (prev.includes(flag)) return prev.filter((item) => item !== flag);
      return [...prev, flag];
    });
  };

  const startEditReason = (resume) => {
    const key = getResumeKey(resume?.id);
    if (!key) return;
    setReasonEditingByResumeId((prev) => ({ ...prev, [key]: true }));
    setReasonDraftByResumeId((prev) => ({
      ...prev,
      [key]: String(resume?.rejection_reason || ""),
    }));
  };

  const cancelEditReason = (resume) => {
    const key = getResumeKey(resume?.id);
    if (!key) return;
    setReasonEditingByResumeId((prev) => ({ ...prev, [key]: false }));
    setReasonDraftByResumeId((prev) => ({
      ...prev,
      [key]: String(resume?.rejection_reason || ""),
    }));
  };

  const saveEditReason = (resume) => {
    const key = getResumeKey(resume?.id);
    if (!key) return;
    const draft = String(reasonDraftByResumeId[key] || "");
    updateResumeOption(resume.id, { rejection_reason: draft });
    setReasonEditingByResumeId((prev) => ({ ...prev, [key]: false }));
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
            <InfoRow
              label="Job Search Status"
              value={student.jobSearchStatus || "PASSIVE"}
            />
            <InfoRow
              label="Internal Flags"
              value={
                Array.isArray(student.internalFlags) &&
                student.internalFlags.length
                  ? student.internalFlags.join(", ")
                  : "None"
              }
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-700">
                Job Search Status
              </div>
              <select
                value={jobSearchStatus}
                onChange={(event) => setJobSearchStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {JOB_SEARCH_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">
                Internal Flags
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERNAL_FLAG_OPTIONS.map((flag) => {
                  const selected = internalFlags.includes(flag);
                  return (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => toggleInternalFlag(flag)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${getInternalFlagClasses(
                        flag,
                        selected,
                      )}`}
                    >
                      {flag}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block md:col-span-2">
              <div className="mb-1 text-xs font-medium text-slate-700">
                Internal Note (optional)
              </div>
              <textarea
                rows={3}
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Add or update the student's internal note"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                This keeps one editable note for the student and can be left empty.
              </div>
            </label>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs font-medium text-slate-700">
                Active Resume &amp; Approval
              </div>
              {resumeLoadError ? (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {resumeLoadError}
                </div>
              ) : null}
              {resumesLoading ? (
                <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Loading latest resumes...
                </div>
              ) : null}
              {resumeOptions.length === 0 && !resumesLoading ? (
                <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No uploaded resumes found for this student yet.
                </div>
              ) : null}
              <div className="space-y-3">
                {resumeOptions.map((resume, index) => {
                  const isActive = String(activeResumeId || "") === String(resume.id || "");
                  const isLatest = index === 0;
                  const status = String(resume.approval_status || "PENDING")
                    .trim()
                    .toUpperCase();
                  const resumeKey = getResumeKey(resume.id);
                  const isEditingReason = Boolean(reasonEditingByResumeId[resumeKey]);
                  const reasonDraft =
                    reasonDraftByResumeId[resumeKey] ??
                    String(resume.rejection_reason || "");
                  const resumeViewUrl =
                    resume.signed_url || resume.file_url || resume.fileUrl || "";

                  return (
                    <div
                      key={resume.id || `resume-${index}`}
                      className={`rounded-xl border p-3 ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {resume.file_name || `Resume ${index + 1}`}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                            {isLatest ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                Latest
                              </span>
                            ) : null}
                            {isActive ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                Active
                              </span>
                            ) : null}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                              Updated {formatDateTime(resume.approved_at || resume.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {resumeViewUrl ? (
                            <a
                              href={resumeViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              View Resume
                            </a>
                          ) : null}
                          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                            <input
                              type="radio"
                              name="active-resume"
                              checked={isActive}
                              onChange={() => syncResumeFields(resume.id, resumeOptions)}
                            />
                            Set Active
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <div className="mb-1 text-xs font-medium text-slate-700">
                            Status
                          </div>
                          <select
                            value={status}
                            onChange={(event) =>
                              updateResumeOption(resume.id, {
                                approval_status: event.target.value,
                                rejection_reason:
                                  event.target.value === "REJECTED"
                                    ? resume.rejection_reason || ""
                                    : "",
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                          >
                            {RESUME_APPROVAL_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="block">
                          <div className="mb-1 text-xs font-medium text-slate-700">
                            Reason
                          </div>
                          {isEditingReason ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={reasonDraft}
                                onChange={(event) =>
                                  setReasonDraftByResumeId((prev) => ({
                                    ...prev,
                                    [resumeKey]: event.target.value,
                                  }))
                                }
                                placeholder={
                                  status === "REJECTED"
                                    ? "Add rejection reason"
                                    : "Optional note"
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEditReason(resume)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Save Reason
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelEditReason(resume)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="min-h-[38px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {String(resume.rejection_reason || "").trim() || "No reason added"}
                              </div>
                              <button
                                type="button"
                                onClick={() => startEditReason(resume)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit Reason
                              </button>
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-slate-500">
                            Click main Save in this modal to persist resume changes.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
    jobSearchStatus: PropTypes.string,
    internalFlags: PropTypes.arrayOf(PropTypes.string),
    activeResumeId: PropTypes.string,
    resumesMeta: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        file_name: PropTypes.string,
        approval_status: PropTypes.string,
      }),
    ),
    internalNotes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        note: PropTypes.string,
        source: PropTypes.string,
        created_at: PropTypes.string,
      }),
    ),
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
