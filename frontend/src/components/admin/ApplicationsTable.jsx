// FILE: src/components/admin/ApplicationsTable.jsx

import { useEffect, useState } from "react";
import { FiEdit2, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { APPLICATION_STATUSES } from "../../utils/constants";

// ── Per-row HR Comment cell ───────────────────────────────────────────────────

function CommentCell({ rowId, savedComment, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(savedComment ?? "");
  const [saving, setSaving] = useState(false);

  // Keep draft in sync if parent refreshes and savedComment changes
  // but only when we're NOT currently editing (don't overwrite user's typing)
  useEffect(() => {
    if (!isEditing) {
      setDraft(savedComment ?? "");
    }
  }, [savedComment, isEditing]);

  const handleEdit = () => {
    setDraft(savedComment ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(savedComment ?? "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rowId, draft);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Editing mode ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="flex min-w-[200px] flex-col gap-2">
        <textarea
          rows={3}
          autoFocus
          placeholder="Add a note..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-none rounded-xl border border-primary bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            <FiCheck className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
          >
            <FiX className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Display mode ────────────────────────────────────────────────────────────
  return (
    <div className="group flex min-w-[200px] items-start justify-between gap-2">
      {savedComment ? (
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {savedComment}
        </p>
      ) : (
        <p className="text-sm italic text-slate-400">No comment</p>
      )}
      <button
        type="button"
        onClick={handleEdit}
        title="Edit comment"
        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary"
      >
        <FiEdit2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ApplicationsTable({
  rows,
  onStatusChange,
  onCommentChange,
  onDeleteApplication,
}) {
  // ── CSV export ─────────────────────────────────────────────────────────────

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
    return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
  };

  const cleanResumeName = (value) =>
    String(value || "")
      .trim()
      .replace(/\.[^/.]+$/, "");

  const getResumeExportValue = (row) => {
    const link =
      row?.resumeUrl ||
      row?.selected_resume_url ||
      row?.selectedResumeUrl ||
      "";
    if (link) return link;
    const byName = cleanResumeName(row?.resumeName);
    if (byName) return byName;
    return cleanResumeName(
      String(row?.selected_resume_url || "")
        .split("/")
        .pop(),
    );
  };

  const boolLabel = (value) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "";
  };

  const handleExport = () => {
    if (!rows?.length) return;

    const firstRow = rows[0] || {};
    const jobName = firstRow.jobTitle || firstRow.jobs?.title || "job";
    const company = firstRow.jobs?.company || firstRow.company || "company";
    const fileName = `${slugify(jobName)}-${slugify(company)}.csv`;

    // Collect all unique custom questions ordered by order_index.
    // Use question id when available to avoid collisions with repeated text.
    const questionMap = new Map();
    (rows || []).forEach((r) => {
      (r.answers || []).forEach((a) => {
        const questionId = a.question_id || a.questionId || a.id || "";
        const questionText = String(a.question || "").trim();
        if (!questionText) return;
        const key = questionId
          ? `${questionId}::${questionText}`
          : questionText;
        if (questionMap.has(key)) return;
        questionMap.set(key, {
          label: questionText,
          answerType: a.answer_type,
          orderIndex: a.order_index ?? 0,
        });
      });
    });
    const customQuestions = [...questionMap.entries()]
      .sort((a, b) => (a[1].orderIndex ?? 0) - (b[1].orderIndex ?? 0))
      .map(([key, meta]) => ({ key, label: meta.label }));

    const staticHeaders = [
      "Date",
      "Email ID",
      "Full Name",
      "Contact Number",
      "Current Location",
      "Total Experience",
      "Relevant Experience",
      "Hands-on Primary Skills",
      "Work Mode Match",
      "Interview Mode Available",
      "Current CTC (in LPA)",
      "Expected CTC (in LPA)",
      "Notice Period",
      "HR Comment",
      "Resume",
    ];

    const headers = [...staticHeaders, ...customQuestions.map((q) => q.label)];

    const csvRows = rows.map((r) => {
      const answerByQuestion = {};
      (r.answers || []).forEach((a) => {
        const questionText = String(a.question || "").trim();
        if (!questionText) return;
        const questionId = a.question_id || a.questionId || a.id || "";
        const key = questionId
          ? `${questionId}::${questionText}`
          : questionText;
        answerByQuestion[key] =
          a.answer_type === "yesno"
            ? boolLabel(a.answer_bool)
            : (a.answer_text ?? "");
      });

      const staticValues = [
        formatAppliedDate(r.appliedAt),
        r.studentEmail || "",
        r.studentName || "",
        r.studentPhone || "",
        r.studentLocation || "",
        r.totalExperience || r.total_experience || "",
        r.relevantExperience || r.relevant_experience || "",
        boolLabel(r.hands_on_primary_skills ?? r.handsOnPrimarySkills),
        boolLabel(r.work_mode_match ?? r.workModeMatch),
        boolLabel(r.interview_mode_available ?? r.interviewModeAvailable),
        r.currentCTC || "",
        r.expectedCTC || "",
        r.noticePeriod || "Not working / Immediately available",
        r.hr_comment ?? "",
        getResumeExportValue(r),
      ];

      const customValues = customQuestions.map(
        (q) => answerByQuestion[q.key] ?? "",
      );

      return [...staticValues, ...customValues].map(escapeCsv).join(",");
    });

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

  // ── Render ──────────────────────────────────────────────────────────────────

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

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-bgLight text-xs uppercase text-slate-600">
            <tr>
              <th className="w-[220px] px-4 py-3 whitespace-nowrap">
                Student Name
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Phone</th>
              <th className="px-4 py-3 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 whitespace-nowrap">Resume</th>
              <th className="px-4 py-3 whitespace-nowrap">Job</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap min-w-[220px]">
                HR Comment
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={8}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="max-w-[220px] whitespace-normal break-words">
                      {r.studentName || "Student"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {r.studentPhone || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {r.studentEmail || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {r.jobTitle}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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

                  {/* HR Comment — pencil to edit, Save/Cancel buttons, persisted */}
                  <td className="px-4 py-3">
                    <CommentCell
                      rowId={r.id}
                      savedComment={r.hr_comment ?? ""}
                      onSave={onCommentChange}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        onDeleteApplication?.(
                          r.id,
                          r.studentName || "This student",
                        )
                      }
                      disabled={!onDeleteApplication}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
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
