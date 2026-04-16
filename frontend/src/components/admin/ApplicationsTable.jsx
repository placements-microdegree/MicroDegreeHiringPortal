// FILE: src/components/admin/ApplicationsTable.jsx

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FiEdit2, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { APPLICATION_STATUSES } from "../../utils/constants";
import { listApplicationCommentHistory } from "../../services/applicationService";

function isCloudDriveClearedStatus(value) {
  const normalized = String(value || "").trim();
  return (
    normalized === "Cleared" ||
    normalized === "Practical Online Task Round Cleared" ||
    normalized === "Face-to-Face Round (Live Interview) Cleared" ||
    normalized === "Managerial Round Cleared" ||
    normalized === "Cleared AWS Drive" ||
    normalized === "Cleared DevOps Drive"
  );
}

// ── Per-row HR Comment cell ───────────────────────────────────────────────────

function CommentCell({
  rowId,
  savedComment,
  savedComment2,
  onSave,
  onGenerateAiSuggestion,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(savedComment ?? "");
  const [draft2, setDraft2] = useState(savedComment2 ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiMeta, setAiMeta] = useState(null);
  const [expandHrComment, setExpandHrComment] = useState(false);
  const [expandStudentComment, setExpandStudentComment] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Keep draft in sync if parent refreshes and savedComment changes
  // but only when we're NOT currently editing (don't overwrite user's typing)
  useEffect(() => {
    if (!isEditing) {
      setDraft(savedComment ?? "");
      setDraft2(savedComment2 ?? "");
      setAiHint("");
      setAiMeta(null);
      setExpandHrComment(false);
      setExpandStudentComment(false);
    }
  }, [savedComment, savedComment2, isEditing]);

  const handleEdit = () => {
    setDraft(savedComment ?? "");
    setDraft2(savedComment2 ?? "");
    setAiHint("");
    setAiMeta(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(savedComment ?? "");
    setDraft2(savedComment2 ?? "");
    setAiHint("");
    setAiMeta(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rowId, draft, draft2, {
        aiSuggestionId: aiMeta?.id || null,
        aiApproved: Boolean(aiMeta?.id && gatePassed),
      });
      setIsEditing(false);

      if (historyOpen) {
        setHistoryLoading(true);
        setHistoryError("");
        try {
          const data = await listApplicationCommentHistory(rowId, {
            limit: 50,
          });
          setHistoryItems(Array.isArray(data) ? data : []);
        } catch (err) {
          setHistoryError(err?.message || "Failed to load history");
        } finally {
          setHistoryLoading(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const formatHistoryDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await listApplicationCommentHistory(rowId, { limit: 50 });
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryItems([]);
      setHistoryError(err?.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAiSuggest = async (regenerate = false) => {
    if (typeof onGenerateAiSuggestion !== "function") return;
    setGenerating(true);
    setAiHint("");
    try {
      const suggestion = await onGenerateAiSuggestion(rowId, { regenerate });
      if (!suggestion) return;

      const nextHrComment = String(suggestion.hr_comment || "").trim();
      const nextStudentComment = String(
        suggestion.student_comment || "",
      ).trim();

      if (nextHrComment) setDraft(nextHrComment);
      if (nextStudentComment) setDraft2(nextStudentComment);

      const score = Number(suggestion.fit_score);
      const confidence = String(suggestion.confidence || "").trim();
      const summary = String(suggestion.summary || "").trim();
      const cached = suggestion.cached === true;
      const gatePassed = suggestion?.quality_gate?.passed === true;

      const parts = [];
      if (Number.isFinite(score))
        parts.push(`Fit score: ${Math.round(score)}%`);
      if (confidence) parts.push(`Confidence: ${confidence}`);
      parts.push(cached ? "Cached" : "Fresh");
      if (!gatePassed) parts.push("Quality gate: review carefully");
      if (summary) parts.push(summary);
      setAiHint(parts.join(" | "));
      setAiMeta(suggestion);
    } finally {
      setGenerating(false);
    }
  };

  const gatePassed = aiMeta?.quality_gate?.passed !== false;
  const matchedSkills = Array.isArray(aiMeta?.matched_skills)
    ? aiMeta.matched_skills
    : [];
  const missingSkills = Array.isArray(aiMeta?.missing_skills)
    ? aiMeta.missing_skills
    : [];

  // ── Editing mode ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="flex min-w-[320px] flex-col gap-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">
            HR Comment
          </span>
          <textarea
            rows={4}
            autoFocus
            placeholder="Add HR comment..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize rounded-xl border border-primary bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
        <textarea
          rows={4}
          placeholder="Add comment for student..."
          value={draft2}
          onChange={(e) => setDraft2(e.target.value)}
          className="w-full resize rounded-xl border border-primary bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleAiSuggest(false)}
            disabled={saving || generating || !onGenerateAiSuggestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary disabled:opacity-60"
          >
            {generating ? "Generating..." : "AI Suggest"}
          </button>
          <button
            type="button"
            onClick={() => handleAiSuggest(true)}
            disabled={saving || generating || !onGenerateAiSuggestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
          >
            Regenerate
          </button>
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
        {aiHint ? <p className="text-xs text-slate-500">{aiHint}</p> : null}
        {aiMeta ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {!gatePassed ? (
              <div className="text-xs font-semibold text-rose-700">
                AI quality gate not passed. Regenerate or edit manually before
                saving.
              </div>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Matched skills
                </p>
                <p className="text-xs text-slate-700">
                  {matchedSkills.length ? matchedSkills.join(", ") : "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Missing skills
                </p>
                <p className="text-xs text-slate-700">
                  {missingSkills.length ? missingSkills.join(", ") : "-"}
                </p>
              </div>
            </div>
            {Array.isArray(aiMeta?.quality_gate?.reasons) &&
            aiMeta.quality_gate.reasons.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                  Gate reasons
                </p>
                <p className="text-xs text-slate-700">
                  {aiMeta.quality_gate.reasons.join(" | ")}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const renderTextBlock = ({
    value,
    expanded,
    onToggle,
    emptyLabel = "No comment",
  }) => {
    const text = String(value || "").trim();
    if (!text) {
      return <p className="text-sm italic text-slate-400">{emptyLabel}</p>;
    }

    const showToggle = text.length > 140 || text.includes("\n");

    return (
      <div className="space-y-1">
        <p
          className={`whitespace-pre-wrap text-sm text-slate-700 ${expanded ? "" : "overflow-hidden"}`}
          style={
            expanded
              ? undefined
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }
          }
        >
          {text}
        </p>
        {showToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="text-xs font-semibold text-primary hover:text-primary/80"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        ) : null}
      </div>
    );
  };

  let historyBody = null;
  if (historyOpen) {
    if (historyLoading) {
      historyBody = (
        <p className="text-xs text-slate-500">Loading history...</p>
      );
    } else if (historyError) {
      historyBody = <p className="text-xs text-rose-700">{historyError}</p>;
    } else if (historyItems.length) {
      historyBody = (
        <div className="space-y-2">
          {historyItems.map((item) => {
            const hr = String(item?.hr_comment || "").trim();
            const student = String(item?.hr_comment_2 || "").trim();
            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <p className="text-[11px] font-semibold text-slate-500">
                  {formatHistoryDate(item.created_at) || "-"}
                </p>
                {hr ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                    {hr}
                  </p>
                ) : null}
                {student ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                    {student}
                  </p>
                ) : null}
                {!hr && !student ? (
                  <p className="mt-1 text-xs italic text-slate-400">-</p>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    } else {
      historyBody = (
        <p className="text-xs italic text-slate-400">No history yet</p>
      );
    }
  }

  // ── Display mode ────────────────────────────────────────────────────────────
  return (
    <div className="group flex min-w-[320px] items-start justify-between gap-2">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          HR Comment
        </p>
        {renderTextBlock({
          value: savedComment,
          expanded: expandHrComment,
          onToggle: () => setExpandHrComment((prev) => !prev),
        })}
        <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Comment for student
        </p>
        {renderTextBlock({
          value: savedComment2,
          expanded: expandStudentComment,
          onToggle: () => setExpandStudentComment((prev) => !prev),
        })}

        <div className="pt-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              History comment
            </p>
            <button
              type="button"
              onClick={async () => {
                const next = !historyOpen;
                setHistoryOpen(next);
                if (next) await loadHistory();
              }}
              className="text-xs font-semibold text-primary hover:text-primary/80"
            >
              {historyOpen ? "Hide" : "Show"}
            </button>
          </div>

          {historyBody}
        </div>
      </div>
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
  onGenerateAiComment,
  onDeleteApplication,
  onStudentClick,
  selectable = false,
  selectedRowIds = [],
  onToggleRow,
  onToggleAll,
  favoriteRowIds = [],
  onToggleFavorite,
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
    const studentLabel = String(row?.studentName || "").trim();
    const byName = cleanResumeName(row?.resumeName);
    const byUrlName = cleanResumeName(
      String(row?.selected_resume_url || row?.resumeUrl || "")
        .split("/")
        .pop(),
    );
    const label = studentLabel || byName || byUrlName || "View Resume";

    if (!link) return label === "View Resume" ? "" : label;

    // Excel-compatible clickable text in CSV export.
    return `=HYPERLINK("${link}","${label}")`;
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

    const resolveCustomQuestionMeta = (answer) => {
      const questionId =
        answer?.question_id || answer?.questionId || answer?.id || "";
      const questionText = String(answer?.question || "").trim();
      if (!questionId && !questionText) return null;

      const label = questionText || `Question ${questionId}`;
      const key = questionId
        ? `qid:${questionId}`
        : `qtxt:${questionText.toLowerCase()}`;

      return { key, label, questionText };
    };

    // Collect all unique custom questions ordered by order_index.
    // Use question id when available so rows still export if question text is missing.
    const questionMap = new Map();
    (rows || []).forEach((r) => {
      (r.answers || []).forEach((a) => {
        const meta = resolveCustomQuestionMeta(a);
        if (!meta) return;

        const existing = questionMap.get(meta.key);
        if (!existing) {
          questionMap.set(meta.key, {
            label: meta.label,
            answerType: a.answer_type,
            orderIndex: a.order_index ?? Number.MAX_SAFE_INTEGER,
          });
          return;
        }

        if (existing.label.startsWith("Question ") && meta.questionText) {
          existing.label = meta.questionText;
        }
        if ((a.order_index ?? Number.MAX_SAFE_INTEGER) < existing.orderIndex) {
          existing.orderIndex = a.order_index ?? Number.MAX_SAFE_INTEGER;
        }
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
      "Comment for student",
      "Student Concern",
      "Resume",
    ];

    const headers = [...staticHeaders, ...customQuestions.map((q) => q.label)];

    const csvRows = rows.map((r) => {
      const answerByQuestion = {};
      (r.answers || []).forEach((a) => {
        const meta = resolveCustomQuestionMeta(a);
        if (!meta) return;

        const isYesNoAnswer =
          a.answer_type === "yesno" || typeof a.answer_bool === "boolean";
        answerByQuestion[meta.key] = isYesNoAnswer
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
        r.hr_comment_2 ?? "",
        r.student_concern ?? "",
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

  const selectedSet = new Set(
    Array.isArray(selectedRowIds) ? selectedRowIds : [],
  );
  const favoriteSet = new Set(
    Array.isArray(favoriteRowIds) ? favoriteRowIds : [],
  );
  const allSelected =
    rows.length > 0 &&
    rows
      .filter((row) => Boolean(row?.studentId))
      .every((row) => selectedSet.has(row.studentId));
  const columnCount = 12 + (selectable ? 1 : 0) + (onToggleFavorite ? 1 : 0);

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
              <th className="px-4 py-3 whitespace-nowrap">SL.NO</th>
              {selectable ? (
                <th className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => onToggleAll?.(event.target.checked)}
                    aria-label="Select all applications"
                  />
                </th>
              ) : null}
              {onToggleFavorite ? (
                <th className="px-4 py-3 whitespace-nowrap">Fav</th>
              ) : null}
              <th className="w-[220px] px-4 py-3 whitespace-nowrap">
                Student Name
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Eligibility</th>
              <th className="px-4 py-3 whitespace-nowrap">Cloud Drive</th>
              <th className="px-4 py-3 whitespace-nowrap">Phone</th>
              <th className="px-4 py-3 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 whitespace-nowrap">Resume</th>
              <th className="px-4 py-3 whitespace-nowrap">Job</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap min-w-[320px]">
                HR Comment
              </th>
              <th className="px-4 py-3 whitespace-nowrap min-w-[220px]">
                Student Concern
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-600" colSpan={columnCount}>
                  No applications yet.
                </td>
              </tr>
            ) : (
              rows.map((r, index) => (
                <tr key={r.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {index + 1}
                  </td>
                  {selectable ? (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(r.studentId)}
                        disabled={!r.studentId}
                        onChange={(event) =>
                          onToggleRow?.(r.studentId, event.target.checked)
                        }
                        aria-label={`Select ${r.studentName || "student"}`}
                      />
                    </td>
                  ) : null}
                  {onToggleFavorite ? (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          r.studentId && onToggleFavorite?.(r.studentId)
                        }
                        disabled={!r.studentId}
                        className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={
                          favoriteSet.has(r.studentId)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        {favoriteSet.has(r.studentId) ? (
                          <AiFillHeart className="h-5 w-5 text-rose-600" />
                        ) : (
                          <AiOutlineHeart className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  ) : null}
                  <td
                    className={`px-4 py-3 font-medium ${
                      isCloudDriveClearedStatus(r.studentCloudDriveStatus)
                        ? "text-emerald-600 font-bold"
                        : "text-slate-900"
                    }`}
                  >
                    <div className="max-w-[220px] whitespace-normal break-words">
                      {onStudentClick ? (
                        <button
                          type="button"
                          onClick={() => onStudentClick(r)}
                          className="text-left text-primary underline-offset-2 hover:underline"
                        >
                          {r.studentName || "Student"}
                        </button>
                      ) : (
                        r.studentName || "Student"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.studentIsEligible ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Eligible
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        Not Eligible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {r.studentCloudDriveStatus || "-"}
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
                      savedComment2={r.hr_comment_2 ?? ""}
                      onSave={onCommentChange}
                      onGenerateAiSuggestion={onGenerateAiComment}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.student_concern ? (
                      <p className="min-w-[220px] whitespace-pre-wrap break-words text-sm text-slate-700">
                        {r.student_concern}
                      </p>
                    ) : (
                      <span className="text-sm italic text-slate-400">-</span>
                    )}
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

CommentCell.propTypes = {
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  savedComment: PropTypes.string,
  savedComment2: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onGenerateAiSuggestion: PropTypes.func,
};

ApplicationsTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  onStatusChange: PropTypes.func,
  onCommentChange: PropTypes.func,
  onGenerateAiComment: PropTypes.func,
  onDeleteApplication: PropTypes.func,
  onStudentClick: PropTypes.func,
  selectable: PropTypes.bool,
  selectedRowIds: PropTypes.arrayOf(PropTypes.string),
  onToggleRow: PropTypes.func,
  onToggleAll: PropTypes.func,
  favoriteRowIds: PropTypes.arrayOf(PropTypes.string),
  onToggleFavorite: PropTypes.func,
};
