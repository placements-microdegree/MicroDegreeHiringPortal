// FILE: src/components/student/ProfileDrawer.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEdit2,
  FiCheck,
  FiX,
  FiUpload,
  FiAlertTriangle,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
} from "react-icons/fi";
import Button from "../common/Button";
import Input from "../common/Input";
import { uploadProfilePhoto } from "../../services/profileService";
import {
  deleteResume,
  listMyResumes,
  uploadResumes,
} from "../../services/resumeService";
import { showError, showInfo } from "../../utils/alerts";

const MAX_RESUMES = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseSkills(value) {
  if (Array.isArray(value))
    return value.map((s) => String(s || "").trim()).filter(Boolean);
  if (typeof value === "string")
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function skillsToString(skills) {
  return parseSkills(skills).join(", ");
}

function hasChanges(form, original) {
  if (!original) return false;
  const keys = [
    "fullName",
    "phone",
    "location",
    "experienceLevel",
    "preferredLocation",
    "experienceYears",
    "currentCTC",
    "expectedCTC",
    "profilePhotoUrl",
  ];
  for (const key of keys) {
    if ((form[key] || "") !== (original[key] || "")) return true;
  }
  // compare skills arrays
  const formSkills = parseSkills(form.skills)
    .map((s) => s.toLowerCase())
    .sort()
    .join(",");
  const originalSkills = parseSkills(original.skills)
    .map((s) => s.toLowerCase())
    .sort()
    .join(",");
  if (formSkills !== originalSkills) return true;
  return false;
}

function sortResumesByLatest(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return [...safeRows].sort((a, b) => {
    const aTime = new Date(
      a?.updated_at || a?.created_at || a?.uploaded_at || 0,
    ).getTime();
    const bTime = new Date(
      b?.updated_at || b?.created_at || b?.uploaded_at || 0,
    ).getTime();
    return bTime - aTime;
  });
}

function getResumeApprovalBadge(status) {
  const normalized = String(status || "PENDING").trim().toUpperCase();
  if (normalized === "APPROVED") {
    return {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  if (normalized === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-rose-100 text-rose-700",
    };
  }
  return {
    label: "Pending review",
    className: "bg-amber-100 text-amber-700",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unsaved Changes Warning Modal
// ─────────────────────────────────────────────────────────────────────────────

function UnsavedWarning({ onSave, onDiscard, onCancel, saving }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <FiAlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Unsaved Changes
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Changes you made will not be saved if you close now.
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Discard & Close
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkillsSection
// ─────────────────────────────────────────────────────────────────────────────

function SkillsSection({ skills, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const textareaRef = useRef(null);

  const savedSkills = parseSkills(skills);

  const openEdit = () => {
    setDraftValue(skillsToString(skills));
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const confirmEdit = () => {
    const parsed = parseSkills(draftValue);
    const seen = new Set();
    const deduped = parsed.filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onChange(deduped);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const onKeyDown = (e) => {
    if (e.key === "Escape") cancelEdit();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">Skills</div>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            <FiEdit2 className="h-3 w-3" />
            {savedSkills.length > 0 ? "Edit Skills" : "Add Skills"}
          </button>
        )}
      </div>

      {/* Edit mode */}
      {editing && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs text-slate-500">
            Edit comma-separated skills. Add new ones or remove existing ones.
            Click <strong>Save Skills</strong> then click the main{" "}
            <strong>Save</strong> button to persist.
          </p>
          <textarea
            ref={textareaRef}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. React, Node.js, AWS, SQL"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
            >
              <FiCheck className="h-3.5 w-3.5" />
              Save Skills
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <FiX className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display chips */}
      {!editing && (
        <div className="flex min-h-[32px] flex-wrap gap-2">
          {savedSkills.length === 0 ? (
            <span className="text-xs italic text-slate-400">
              No skills added yet. Click "Add Skills" to get started.
            </span>
          ) : (
            savedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                {skill}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileDrawer
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileDrawer({ open, onClose, profile, onSave }) {
  const initial = useMemo(
    () =>
      profile || {
        fullName: "",
        email: "",
        phone: "",
        role: "",
        location: "",
        preferredLocation: "",
        skills: [],
        experienceLevel: "Fresher",
        experienceYears: "",
        currentCTC: "",
        expectedCTC: "",
        profilePhotoUrl: "",
      },
    [profile],
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [showWarning, setShowWarning] = useState(false);

  // Track the "saved" baseline separately so hasChanges compares against
  // what's actually in DB, not the live profile prop
  const savedBaselineRef = useRef(initial);

  const lastProfileRef = useRef(null);
  useEffect(() => {
    if (profile !== lastProfileRef.current) {
      lastProfileRef.current = profile;
      savedBaselineRef.current = initial;
      setForm(initial);
    }
  }, [profile, initial]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadResumes = async () => {
      setResumesLoading(true);
      try {
        const rows = await listMyResumes();
        if (active) setResumes(sortResumesByLatest(rows || []));
      } catch {
        if (active) setResumes([]);
      } finally {
        if (active) setResumesLoading(false);
      }
    };

    loadResumes();
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  const isDirty = hasChanges(form, savedBaselineRef.current);

  // ── Attempt to close — show warning if dirty ──────────────────────────────
  const tryClose = () => {
    if (isDirty) {
      setShowWarning(true);
    } else {
      onClose();
    }
  };

  // ── Photo upload — does NOT call onSave, just updates local form ──────────
  const onPickPhoto = async (file) => {
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { url } = await uploadProfilePhoto(file);
      update({ profilePhotoUrl: url });
    } catch {
      update({ profilePhotoUrl: URL.createObjectURL(file) });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUploadResumes = async (files) => {
    if (!files?.length) return;

    if (resumes.length >= MAX_RESUMES) {
      await showInfo(
        "Maximum 3 resumes allowed. Please delete an existing resume before uploading a new one.",
        "Resume Limit Reached",
      );
      return;
    }

    const remaining = MAX_RESUMES - resumes.length;
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      await showInfo(
        `Only ${remaining} more resume(s) can be uploaded. Extra files were ignored.`,
        "Resume Limit",
      );
    }

    setResumeBusy(true);
    try {
      await uploadResumes(accepted);
      const rows = await listMyResumes();
      setResumes(sortResumesByLatest(rows || []));
    } catch (err) {
      await showError(
        err?.message || "Failed to upload resume",
        "Upload Failed",
      );
    } finally {
      setResumeBusy(false);
    }
  };

  const handleDeleteResume = async (resume) => {
    if (!resume?.id) return;

    setResumeBusy(true);
    try {
      await deleteResume(resume.id);
      const rows = await listMyResumes();
      setResumes(sortResumesByLatest(rows || []));
    } catch (err) {
      await showError(
        err?.message || "Failed to delete resume",
        "Delete Failed",
      );
    } finally {
      setResumeBusy(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      await onSave(form);
      savedBaselineRef.current = form; // update baseline so dirty flag resets
      setShowWarning(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // ── Discard ───────────────────────────────────────────────────────────────
  const discard = () => {
    setForm(initial);
    setShowWarning(false);
    onClose();
  };

  const displayEmail = form.email || profile?.email || "";
  const quota = Number(profile?.applicationQuota ?? 0);
  const notStudentHelpText =
    "Credits are used to apply for premium jobs. Each application costs one credit. To become an eligible student, please contact our support team with your student details for verification.";

  let saveButtonLabel = "Save";
  if (saving) saveButtonLabel = "Saving...";
  else if (photoUploading) saveButtonLabel = "Uploading photo...";
  else if (resumeBusy) saveButtonLabel = "Updating resume...";

  let resumeListContent = null;
  if (resumesLoading) {
    resumeListContent = (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Loading resumes...
      </div>
    );
  } else if (resumes.length === 0) {
    resumeListContent = (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No resumes uploaded yet.
      </div>
    );
  } else {
    resumeListContent = resumes.map((resume, index) => {
      const resumeKey =
        resume.id ||
        resume.file_url ||
        resume.storage_path ||
        `${resume.file_name || "resume"}-${index}`;
      const isLatest = index === 0;
      const isActiveResume =
        String(profile?.activeResumeId || "").trim() === String(resume.id || "").trim();
      const approvalBadge = getResumeApprovalBadge(resume?.approval_status);
      const viewUrl = resume.signed_url || resume.file_url || resume.url;

      return (
        <div
          key={resumeKey}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm text-slate-800">
              {resume.file_name || "Resume"}
            </span>
            {isLatest && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Latest
              </span>
            )}
            {isActiveResume && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Active
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${approvalBadge.className}`}
            >
              {approvalBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {viewUrl ? (
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary hover:text-primaryDark"
              >
                View
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => handleDeleteResume(resume)}
              disabled={resumeBusy}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300"
            >
              Delete
            </button>
          </div>
        </div>
      );
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* Backdrop — clicking it triggers the unsaved warning check */}
        <div className="absolute inset-0 bg-slate-900/30" onClick={tryClose} />

        {/* Drawer */}
        <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-sm sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold text-slate-900">
                Edit Profile
              </div>
              {isDirty && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Unsaved
                </span>
              )}
            </div>
            <Button variant="subtle" onClick={tryClose}>
              Close
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-4">
            {/* Photo */}
            <div className="rounded-xl border border-slate-200 bg-bgLight p-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200">
                  {form.profilePhotoUrl ? (
                    <img
                      src={form.profilePhotoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
                      {(form.fullName || displayEmail || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="cursor-pointer text-sm font-medium text-slate-700">
                  Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="profile-photo-input mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
                    onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
                    disabled={photoUploading}
                  />
                  {photoUploading && (
                    <span className="mt-1 block text-xs text-primary">
                      Uploading...
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Email — read-only */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={displayEmail}
                disabled
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Resume */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Resume
                  </div>
                  <div className="text-xs text-slate-500">
                    Keep your latest resume updated for job applications (max{" "}
                    {MAX_RESUMES}).{" "}
                    {resumes.length >= MAX_RESUMES && (
                      <span className="font-semibold text-amber-600">
                        Limit reached - delete one to upload a new resume.
                      </span>
                    )}
                  </div>
                </div>

                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${resumes.length >= MAX_RESUMES || resumeBusy ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"}`}
                >
                  <FiUpload className="h-4 w-4" />
                  {resumeBusy ? "Updating..." : "Upload Resume"}
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      handleUploadResumes(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                    disabled={resumeBusy || resumes.length >= MAX_RESUMES}
                  />
                </label>
              </div>

              <div className="mt-3 space-y-2">{resumeListContent}</div>
            </div>

            {/* Mobile-only eligibility and credits */}
            <div className="md:hidden">
              {profile?.isEligible === true ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  Eligible
                </div>
              ) : profile?.isEligible === false ? (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                  title={notStudentHelpText}
                >
                  <FiXCircle className="h-3.5 w-3.5" />
                  Not a Student · Free Credits Left: {quota}
                </div>
              ) : quota > 0 ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <FiAlertCircle className="h-3.5 w-3.5" />
                  Free Credits Left: {quota}
                </div>
              ) : null}
            </div>

            {/* Basic fields */}
            <Input
              label="Full Name"
              value={form.fullName || ""}
              onChange={(e) => update({ fullName: e.target.value })}
              placeholder="Your full name"
            />
            <Input
              label="Phone"
              value={form.phone || ""}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Location"
              value={form.location || ""}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="e.g. Bengaluru, Karnataka"
            />
            <Input
              label="Preferred Job Location"
              value={form.preferredLocation || ""}
              onChange={(e) => update({ preferredLocation: e.target.value })}
              placeholder="e.g. Bengaluru, Hyderabad"
            />

            {/* Skills */}
            <SkillsSection
              skills={form.skills}
              onChange={(updated) => update({ skills: updated })}
            />

            {/* Experience */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Experience
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={
                    form.experienceLevel === "Experienced"
                      ? "primary"
                      : "outline"
                  }
                  onClick={() => update({ experienceLevel: "Experienced" })}
                >
                  Experienced
                </Button>
                <Button
                  variant={
                    form.experienceLevel === "Fresher" ? "primary" : "outline"
                  }
                  onClick={() => update({ experienceLevel: "Fresher" })}
                >
                  Fresher
                </Button>
              </div>

              {form.experienceLevel === "Experienced" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Input
                    label="Experience Years"
                    value={form.experienceYears || ""}
                    onChange={(e) =>
                      update({ experienceYears: e.target.value })
                    }
                  />
                  <Input
                    label="Current CTC (in LPA)"
                    value={form.currentCTC || ""}
                    onChange={(e) => update({ currentCTC: e.target.value })}
                  />
                  <Input
                    label="Expected CTC (LPA)"
                    className="col-span-2"
                    value={form.expectedCTC || ""}
                    onChange={(e) => update({ expectedCTC: e.target.value })}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <Input
                    label="Expected CTC (LPA)"
                    value={form.expectedCTC || ""}
                    onChange={(e) => update({ expectedCTC: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-5 py-4">
            <Button
              className="w-full"
              onClick={save}
              disabled={saving || photoUploading || resumeBusy}
            >
              {saveButtonLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved changes warning modal */}
      {showWarning && (
        <UnsavedWarning
          saving={saving}
          onSave={save}
          onDiscard={discard}
          onCancel={() => setShowWarning(false)}
        />
      )}
    </>
  );
}
