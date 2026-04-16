// FILE: src/components/admin/ManageApplicationsByJobView.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiRefreshCw,
  FiSearch,
  FiUpload,
  FiUserPlus,
  FiX,
  FiChevronDown,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { confirmDanger, showError } from "../../utils/alerts";
import ApplicationsTable from "./ApplicationsTable";
import StudentProfileModal from "./StudentProfileModal";
import {
  addFavoriteStudents,
  listFavoriteStudents,
  removeFavoriteStudents,
} from "../../services/adminService";
import {
  deleteApplication,
  listAllApplications,
  updateApplicationStatus,
  updateApplicationComment,
  generateAiCommentSuggestion,
  applyOnBehalf,
  searchStudents,
  getStudentProfileForHR,
  getStudentResumesForHR,
  uploadResumesForStudent,
  deleteResumeForStudent,
} from "../../services/applicationService";
import { listJobs } from "../../services/jobService";
import { updateStudentCloudDriveProfile } from "../../services/adminService";
import { APPLICATION_STATUSES } from "../../utils/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getJobId(application) {
  return (
    application.job_id ||
    application.jobId ||
    application.job?.id ||
    application.jobs?.id ||
    null
  );
}
function getJobTitle(application) {
  return (
    application.job?.title ||
    application.jobs?.title ||
    application.jobTitle ||
    "Untitled Job"
  );
}
function normalizeJobStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "active") return "active";
  if (value === "deleted") return "deleted";
  return "closed";
}
function getJobStatusChipClasses(status) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "deleted") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}
function formatPostedDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseExperienceYears(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).toLowerCase();
  if (text.includes("fresher")) return 0;
  const numbers = text.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const first = Number(numbers[0]);
  return Number.isFinite(first) ? first : null;
}

function monthKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const JOB_EXPERIENCE_BUCKETS = [
  { id: "0to1", label: "0-1" },
  { id: "2to3", label: "2-3" },
  { id: "4to5", label: "4-5" },
  { id: "6to7", label: "6-7" },
  { id: "8to9", label: "8-9" },
  { id: "10", label: "10" },
  { id: "10plus", label: "10+" },
];

const ENTRY_LEVEL_TAGS = [
  { id: "internship", label: "Internship" },
  { id: "fresher", label: "Fresher" },
];

function classifyJobExperience(rawExperience) {
  const text = String(rawExperience || "")
    .trim()
    .toLowerCase();

  const entryTags = [];
  if (/\bintern(ship)?\b/.test(text)) entryTags.push("internship");
  if (/\bfresher(s)?\b/.test(text)) entryTags.push("fresher");

  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)/);
  const plusMatch = text.match(/(\d+(?:\.\d+)?)\s*\+/);
  const numericMatches = text.match(/\d+(?:\.\d+)?/g) || [];

  let start = null;
  let hasPlus = false;

  if (rangeMatch) {
    start = Number(rangeMatch[1]);
  } else if (plusMatch) {
    start = Number(plusMatch[1]);
    hasPlus = true;
  } else if (numericMatches.length) {
    start = Number(numericMatches[0]);
  }

  if (!Number.isFinite(start)) {
    return { bucket: null, entryTags };
  }

  if (hasPlus && start >= 10) return { bucket: "10plus", entryTags };
  if (start > 10) return { bucket: "10plus", entryTags };
  if (start === 10) return { bucket: "10", entryTags };
  if (start >= 8) return { bucket: "8to9", entryTags };
  if (start >= 6) return { bucket: "6to7", entryTags };
  if (start >= 4) return { bucket: "4to5", entryTags };
  if (start >= 2) return { bucket: "2to3", entryTags };
  return { bucket: "0to1", entryTags };
}

function toggleMultiValue(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function getStageFromStatus(status) {
  const rawValue = String(status || "").trim();
  const statusAliases = {
    Shortlisted: "Screening call Received",
    "Resume Screening Rejected": "Resume Not Matched",
    "Profile Mapped for client": "Mapped to Client",
    "Interview Scheduled": "Interview scheduled",
    Interview: "Interview scheduled",
    "Final Round": "final Round",
    "Client Rejected": "screening Discolified",
    Rejected: "screening Discolified",
    "Position Closed": "Position closed",
    "Job on hold/ position closed": "Position closed",
    Selected: "Placed",
  };
  const value = statusAliases[rawValue] || rawValue;
  const stageByStatus = {
    Applied: "Applied",
    "Resume Not Matched": "Screening",
    "Mapped to Client": "Mapped",
    "Screening call Received": "Screening",
    "screening Discolified": "Screening",
    "Interview scheduled": "Interview",
    "Interview Not Cleared": "Interview",
    "Technical Round": "Interview",
    "final Round": "Final",
    Placed: "Closed",
    "Job on hold": "Closed",
    "Position closed": "Closed",
  };

  return stageByStatus[value] || "Applied";
}

function mapApplicationRow(row, jobsById) {
  const resumes =
    row.student?.resumes ||
    row.profiles?.resumes ||
    row.resumes ||
    (Array.isArray(row.profiles?.resumes) ? row.profiles.resumes : []);
  const selectedResume = (Array.isArray(resumes) ? resumes : []).find(
    (item) => item?.file_url === row.selected_resume_url,
  );
  const fallbackResume = Array.isArray(resumes) ? resumes[0] : null;
  const resume = selectedResume || fallbackResume || null;
  const jobId = getJobId(row);
  const jobFromLookup = jobId ? jobsById.get(String(jobId)) : null;
  const mergedJob = row.job
    ? { ...row.job, ...(jobFromLookup || {}) }
    : row.jobs
      ? { ...row.jobs, ...(jobFromLookup || {}) }
      : jobFromLookup || null;
  const jobTitle =
    mergedJob?.title || row.jobTitle || jobFromLookup?.title || "Untitled Job";
  const jobCompany = mergedJob?.company || row.company || "-";
  const student = row.student || row.profiles || null;
  const studentCloudDriveStatus =
    student?.cloud_drive_status || row.cloud_drive_status || null;
  return {
    ...row,
    job_id: row.job_id || row.jobId || jobId,
    job: mergedJob || null,
    jobs:
      mergedJob ||
      (jobId ? { id: jobId, title: jobTitle, company: jobCompany } : null),
    studentName: student?.full_name || row.studentName,
    studentId: student?.id || row.student_id || row.studentId || null,
    studentPhone: student?.phone,
    studentEmail: student?.email,
    studentCloudDriveStatus,
    driveClearedDate:
      student?.drive_cleared_date || row.drive_cleared_date || null,
    studentCloudDriveHistory:
      student?.cloud_drive_status_history ||
      row.cloud_drive_status_history ||
      [],
    studentIsEligible:
      typeof student?.is_eligible === "boolean"
        ? student.is_eligible
        : Boolean(row.is_eligible || row.student_is_eligible),
    studentEligibleUntil:
      student?.eligible_until ||
      row.eligible_until ||
      row.student_eligible_until ||
      null,
    studentLocation: student?.location || "",
    studentPreferredLocation:
      student?.preferred_location || row.preferred_location || "",
    totalExperience:
      student?.total_experience ||
      row.total_experience ||
      row.totalExperience ||
      "",
    currentCTC: student?.current_ctc || row.current_ctc || row.currentCTC || "",
    expectedCTC:
      student?.expected_ctc || row.expected_ctc || row.expectedCTC || "",
    noticePeriod: row.notice_period || row.noticePeriod || "",
    appliedAt: row.created_at || row.createdAt || null,
    resumeName:
      resume?.file_name ||
      (row.selected_resume_url
        ? String(row.selected_resume_url).split("/").pop()
        : ""),
    resumeUrl:
      resume?.signed_url ||
      resume?.file_url ||
      resume?.url ||
      resume?.public_url ||
      row.resumeUrl,
    jobTitle,
    hr_comment: row.hr_comment ?? null,
    hr_comment_2: row.hr_comment_2 ?? null,
    student_concern: row.student_concern ?? null,
    stage: row.stage || getStageFromStatus(row.sub_stage || row.status),
    sub_stage: row.sub_stage || row.status || "Applied",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form atoms
// ─────────────────────────────────────────────────────────────────────────────

function YesNoToggle({ value, onChange, error }) {
  return (
    <div
      className={`inline-flex rounded-xl border p-1 ${error ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${value === true ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${value === false ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
      >
        No
      </button>
    </div>
  );
}

function QuestionToggle({ label, sublabel, value, onChange, error }) {
  return (
    <div>
      <div
        className={`mb-0.5 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}
      >
        {label}
      </div>
      {sublabel ? (
        <div className="mb-2 text-xs text-slate-500">{sublabel}</div>
      ) : (
        <div className="mb-2" />
      )}
      <YesNoToggle value={value} onChange={onChange} error={error} />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <FiAlertCircle className="h-3 w-3" /> Required
        </p>
      )}
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, error, required }) {
  return (
    <label className="block">
      <div
        className={`mb-1 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </div>
      <input
        type="text"
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-primary ${error ? "border-red-400" : "border-slate-200"}`}
        value={value}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-red-600">Required</p>}
    </label>
  );
}

function CustomQuestionField({ question, index, value, onChange, error }) {
  const isYesNo = question.answer_type === "yesno";
  return (
    <div className="col-span-2">
      <div
        className={`mb-1 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}
      >
        Q{index + 1}. {question.question}
        <span className="ml-1 text-red-500">*</span>
      </div>
      {isYesNo ? (
        <>
          <YesNoToggle
            value={typeof value === "boolean" ? value : null}
            onChange={onChange}
            error={error}
          />
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <FiAlertCircle className="h-3 w-3" />
              Required
            </p>
          )}
        </>
      ) : (
        <>
          <textarea
            rows={2}
            placeholder="Type answer here..."
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${error ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
          />
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <FiAlertCircle className="h-3 w-3" />
              Required
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply On Behalf Modal — unchanged from before
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  isCurrentlyWorking: null,
  noticePeriod: "",
  totalExperience: "",
  relevantExperience: "",
  handsOnPrimarySkills: null,
  workModeMatch: null,
  interviewModeAvailable: null,
  currentCTC: "",
  expectedCTC: "",
  selectedResumeUrl: "",
  jdConfirmed: false,
};

function ApplyOnBehalfModal({ job, onClose, onSuccess }) {
  const jobId = job?.id;
  const jobTitle = job?.title || "Job";

  const jobQuestions = useMemo(
    () =>
      Array.isArray(job?.questions)
        ? [...job.questions].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
          )
        : [],
    [job],
  );
  const jobWorkMode = job?.work_mode || "";
  const jobExperience = job?.experience || "";
  const interviewModeDisplay = useMemo(() => {
    const raw = job?.interview_mode;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string") return raw;
    return "";
  }, [job]);
  const selectedSkills = useMemo(() => {
    if (Array.isArray(job?.skills)) return job.skills.join(", ");
    if (typeof job?.skills === "string") return job.skills;
    return "";
  }, [job]);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [resumeFetchError, setResumeFetchError] = useState("");
  const searchTimeout = useRef(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [hrNote, setHrNote] = useState("");

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateAnswer = (qId, val) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }));

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const errors = useMemo(() => {
    const e = {};
    if (typeof form.isCurrentlyWorking !== "boolean")
      e.isCurrentlyWorking = true;
    if (form.isCurrentlyWorking && !String(form.noticePeriod || "").trim())
      e.noticePeriod = true;
    if (!String(form.totalExperience || "").trim()) e.totalExperience = true;
    if (!String(form.relevantExperience || "").trim())
      e.relevantExperience = true;
    if (typeof form.handsOnPrimarySkills !== "boolean")
      e.handsOnPrimarySkills = true;
    if (typeof form.workModeMatch !== "boolean") e.workModeMatch = true;
    if (typeof form.interviewModeAvailable !== "boolean")
      e.interviewModeAvailable = true;
    if (!String(form.currentCTC || "").trim()) e.currentCTC = true;
    if (!String(form.expectedCTC || "").trim()) e.expectedCTC = true;
    if (!String(form.selectedResumeUrl || "").trim())
      e.selectedResumeUrl = true;
    if (!form.jdConfirmed) e.jdConfirmed = true;
    jobQuestions.forEach((q) => {
      const ans = answers[q.id];
      if (q.answer_type === "yesno") {
        if (typeof ans !== "boolean") e[`answer_${q.id}`] = true;
      } else {
        if (!ans || !String(ans).trim()) e[`answer_${q.id}`] = true;
      }
    });
    return e;
  }, [form, answers, jobQuestions]);

  const show = () => submitted;

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || selectedStudent) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchStudents(query.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [query, selectedStudent]);

  const fetchStudentData = async (student) => {
    setLoadingProfile(true);
    setResumeFetchError("");
    try {
      const [profile, resumeRows] = await Promise.all([
        getStudentProfileForHR(student.id),
        getStudentResumesForHR(student.id),
      ]);
      const safeResumes = Array.isArray(resumeRows) ? resumeRows : [];
      setResumes(safeResumes);
      setForm({
        isCurrentlyWorking:
          typeof profile?.is_currently_working === "boolean"
            ? profile.is_currently_working
            : null,
        noticePeriod: "",
        totalExperience: profile?.total_experience
          ? String(profile.total_experience)
          : profile?.experience_years
            ? String(profile.experience_years)
            : "",
        relevantExperience: "",
        handsOnPrimarySkills: null,
        workModeMatch: null,
        interviewModeAvailable: null,
        currentCTC: profile?.current_ctc ? String(profile.current_ctc) : "",
        expectedCTC: profile?.expected_ctc ? String(profile.expected_ctc) : "",
        selectedResumeUrl:
          safeResumes.length === 1 ? safeResumes[0]?.file_url || "" : "",
        jdConfirmed: false,
      });
    } catch (err) {
      setResumeFetchError(
        err?.message || "Failed to load student data. Please try again.",
      );
      setResumes([]);
    } finally {
      setLoadingProfile(false);
    }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setQuery(student.full_name || student.email || "");
    setSearchResults([]);
    setForm({ ...EMPTY_FORM });
    setResumes([]);
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
    setResumeFetchError("");
    await fetchStudentData(student);
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setQuery("");
    setSearchResults([]);
    setForm({ ...EMPTY_FORM });
    setResumes([]);
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
    setResumeFetchError("");
  };

  const MAX_RESUMES = 3;

  const handleUploadResumes = async (files) => {
    if (!files?.length || !selectedStudent) return;
    if (resumes.length >= MAX_RESUMES) return;
    const remaining = MAX_RESUMES - resumes.length;
    const accepted = Array.from(files).slice(0, remaining);
    setUploading(true);
    setResumeFetchError("");
    try {
      const updated = await uploadResumesForStudent(
        selectedStudent.id,
        accepted,
      );
      const safeResumes = Array.isArray(updated) ? updated : [];
      setResumes(safeResumes);
      if (!form.selectedResumeUrl && safeResumes.length > 0) {
        update({ selectedResumeUrl: safeResumes[0].file_url });
      }
    } catch (err) {
      setResumeFetchError(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async (resume) => {
    if (!resume?.id || !selectedStudent) return;
    setUploading(true);
    setResumeFetchError("");
    try {
      await deleteResumeForStudent(resume.id);
      const updated = await getStudentResumesForHR(selectedStudent.id);
      const safeResumes = Array.isArray(updated) ? updated : [];
      setResumes(safeResumes);
      if (form.selectedResumeUrl === resume.file_url) {
        update({ selectedResumeUrl: safeResumes[0]?.file_url || "" });
      }
    } catch (err) {
      setResumeFetchError(err?.message || "Delete failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitted(true);
    if (!selectedStudent) {
      setSubmitError("Please select a student.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      setSubmitError("Please fill all required fields highlighted below.");
      return;
    }

    const answersPayload = jobQuestions.map((q) => ({
      questionId: q.id,
      answerType: q.answer_type,
      answer: answers[q.id] ?? null,
    }));

    setSubmitting(true);
    try {
      await applyOnBehalf({
        studentId: selectedStudent.id,
        jobId,
        noticePeriod: form.noticePeriod || null,
        relevantExperience: form.relevantExperience || null,
        handsOnPrimarySkills: form.handsOnPrimarySkills,
        workModeMatch: form.workModeMatch,
        interviewModeAvailable: form.interviewModeAvailable,
        selectedResumeUrl: form.selectedResumeUrl || null,
        hrNote: hrNote || null,
        answers: answersPayload,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err?.message || "Failed to apply on behalf.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Apply on Behalf
            </div>
            <div className="mt-0.5 max-w-sm truncate text-xs text-slate-500">
              Job: {jobTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <section>
            <div className="mb-1 text-sm font-medium text-slate-700">
              Search Student <span className="text-red-500">*</span>
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-primary"
                value={query}
                autoFocus
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedStudent) clearStudent();
                }}
              />
              {selectedStudent && (
                <button
                  type="button"
                  onClick={clearStudent}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selectedStudent && (searchResults.length > 0 || searching) && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {searching && (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    Searching...
                  </div>
                )}
                {!searching &&
                  searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStudent(s)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(s.full_name || s.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {s.full_name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.email}
                          {s.phone ? ` · ${s.phone}` : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                {!searching && searchResults.length === 0 && query.trim() && (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No students found.
                  </div>
                )}
              </div>
            )}

            {selectedStudent && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-700">
                  {(selectedStudent.full_name ||
                    selectedStudent.email ||
                    "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    {selectedStudent.full_name}
                  </div>
                  <div className="text-xs text-emerald-700">
                    {selectedStudent.email}
                  </div>
                </div>
              </div>
            )}
          </section>

          {loadingProfile && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 animate-pulse">
              Loading student profile and resumes...
            </div>
          )}

          {!loadingProfile && resumeFetchError && selectedStudent && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{resumeFetchError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchStudentData(selectedStudent)}
                className="shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          )}

          {selectedStudent && !loadingProfile && !resumeFetchError && (
            <>
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 text-slate-700 md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Company:
                    </span>{" "}
                    {job?.company || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Work Mode:
                    </span>{" "}
                    {jobWorkMode || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Experience:
                    </span>{" "}
                    {jobExperience || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Interview:
                    </span>{" "}
                    {interviewModeDisplay || "—"}
                  </div>
                  {selectedSkills && (
                    <div className="md:col-span-2">
                      <span className="font-semibold text-slate-900">
                        Skills:
                      </span>{" "}
                      {selectedSkills}
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <QuestionToggle
                  label="Is the student currently working?"
                  value={form.isCurrentlyWorking}
                  onChange={(v) =>
                    update({
                      isCurrentlyWorking: v,
                      noticePeriod: v ? form.noticePeriod : "",
                    })
                  }
                  error={show() && errors.isCurrentlyWorking}
                />
                {form.isCurrentlyWorking ? (
                  <FieldInput
                    label="Notice Period"
                    value={form.noticePeriod}
                    onChange={(v) => update({ noticePeriod: v })}
                    placeholder="e.g. 30 days / Immediate"
                    error={show() && errors.noticePeriod}
                    required
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Notice period field appears only for currently working
                    candidates.
                  </div>
                )}

                <div>
                  <div
                    className={`mb-1.5 text-sm font-medium ${show() && errors.totalExperience ? "text-red-600" : "text-slate-700"}`}
                  >
                    Total Experience <span className="text-red-500">*</span>
                    {show() && errors.totalExperience && (
                      <span className="ml-2 text-xs font-normal text-red-500">
                        — Required
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-xl border px-4 py-3 ${show() && errors.totalExperience ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Years</span>
                      <span className="font-semibold text-slate-900">
                        {form.totalExperience
                          ? `${form.totalExperience} yr${Number(form.totalExperience) === 1 ? "" : "s"}`
                          : "Select"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={form.totalExperience || 1}
                      onChange={(e) =>
                        update({ totalExperience: e.target.value })
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                      <span>1 yr</span>
                      <span>20 yrs</span>
                    </div>
                  </div>
                </div>

                <FieldInput
                  label="Relevant Experience as per JD"
                  value={form.relevantExperience}
                  onChange={(v) => update({ relevantExperience: v })}
                  placeholder="e.g. 2 years in React / AWS"
                  error={show() && errors.relevantExperience}
                  required
                />

                <QuestionToggle
                  label={
                    selectedSkills
                      ? `Hands-on with: ${selectedSkills}?`
                      : "Hands-on with required skills?"
                  }
                  sublabel={
                    selectedSkills ? "Skills listed in the JD" : undefined
                  }
                  value={form.handsOnPrimarySkills}
                  onChange={(v) => update({ handsOnPrimarySkills: v })}
                  error={show() && errors.handsOnPrimarySkills}
                />
                <QuestionToggle
                  label={
                    jobWorkMode
                      ? `Comfortable with ${jobWorkMode} work mode?`
                      : "Work mode match?"
                  }
                  sublabel={
                    jobWorkMode
                      ? `This role requires ${jobWorkMode}`
                      : undefined
                  }
                  value={form.workModeMatch}
                  onChange={(v) => update({ workModeMatch: v })}
                  error={show() && errors.workModeMatch}
                />
                <QuestionToggle
                  label={
                    interviewModeDisplay
                      ? `Available for ${interviewModeDisplay} interview?`
                      : "Available for interview?"
                  }
                  sublabel={
                    interviewModeDisplay
                      ? `Interview mode: ${interviewModeDisplay}`
                      : undefined
                  }
                  value={form.interviewModeAvailable}
                  onChange={(v) => update({ interviewModeAvailable: v })}
                  error={show() && errors.interviewModeAvailable}
                />
                <div className="hidden md:block" />

                <FieldInput
                  label="Current CTC (in LPA)"
                  value={form.currentCTC}
                  onChange={(v) => update({ currentCTC: v })}
                  placeholder="e.g. 4.5 LPA"
                  error={show() && errors.currentCTC}
                  required
                />
                <FieldInput
                  label="Expected CTC (in LPA)"
                  value={form.expectedCTC}
                  onChange={(v) => update({ expectedCTC: v })}
                  placeholder="e.g. 6.5 LPA"
                  error={show() && errors.expectedCTC}
                  required
                />

                {jobQuestions.length > 0 && (
                  <>
                    <div className="col-span-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-semibold text-slate-800">
                        Additional Questions
                      </p>
                      <p className="text-xs text-slate-500">
                        All questions below are required.
                      </p>
                    </div>
                    {jobQuestions.map((q, i) => (
                      <CustomQuestionField
                        key={q.id}
                        question={q}
                        index={i}
                        value={answers[q.id]}
                        onChange={(val) => updateAnswer(q.id, val)}
                        error={show() && errors[`answer_${q.id}`]}
                      />
                    ))}
                  </>
                )}
              </section>

              <section
                className={`rounded-xl border p-4 ${show() && errors.selectedResumeUrl ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div
                      className={`text-sm font-semibold ${show() && errors.selectedResumeUrl ? "text-red-700" : "text-slate-900"}`}
                    >
                      Resume Selector
                      {show() && errors.selectedResumeUrl && (
                        <span className="ml-2 text-xs font-normal text-red-600">
                          — Please select a resume
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {resumes.length >= MAX_RESUMES ? (
                        <span className="font-semibold text-amber-600">
                          Limit reached (3/3) — delete one to upload a new
                          resume.
                        </span>
                      ) : resumes.length > 0 ? (
                        `${resumes.length}/3 resume${resumes.length === 1 ? "" : "s"} — choose one to submit.`
                      ) : (
                        "No resumes yet — upload one below."
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        resumes.length >= MAX_RESUMES || uploading
                          ? "cursor-not-allowed border-slate-200 text-slate-400"
                          : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      <FiUpload className="h-3.5 w-3.5" />
                      {uploading ? "Uploading..." : "Upload Resume"}
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf"
                        disabled={uploading || resumes.length >= MAX_RESUMES}
                        onChange={(e) => handleUploadResumes(e.target.files)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchStudentData(selectedStudent)}
                      disabled={loadingProfile || uploading}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50"
                      title="Reload resumes from database"
                    >
                      <FiRefreshCw
                        className={`h-3.5 w-3.5 ${loadingProfile ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {resumeFetchError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    ⚠ {resumeFetchError}
                  </div>
                )}

                {resumes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No resumes uploaded yet. Use the{" "}
                    <strong>Upload Resume</strong> button above to add one on
                    behalf of the student — it will be saved to their profile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resumes.map((resume) => (
                      <label
                        key={resume.id || resume.file_url}
                        className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                          form.selectedResumeUrl === resume.file_url
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name="hr_selectedResume"
                            checked={form.selectedResumeUrl === resume.file_url}
                            onChange={() =>
                              update({ selectedResumeUrl: resume.file_url })
                            }
                          />
                          <span className="truncate text-sm text-slate-800">
                            {resume.file_name || "Resume"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {(resume.signed_url || resume.file_url) && (
                            <a
                              href={resume.signed_url || resume.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-semibold text-primary hover:text-primary/80"
                            >
                              View
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteResume(resume);
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <label
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    show() && errors.jdConfirmed
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.jdConfirmed}
                    onChange={(e) => update({ jdConfirmed: e.target.checked })}
                  />
                  <span>
                    Confirmed that the student has read the Job Description
                    fully.
                    {show() && errors.jdConfirmed && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <FiAlertCircle className="h-3 w-3" /> Required
                      </span>
                    )}
                  </span>
                </label>
              </section>

              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">
                  HR Note (optional)
                </div>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="e.g. Applied on behalf — student contacted via phone"
                  value={hrNote}
                  onChange={(e) => setHrNote(e.target.value)}
                />
              </label>
            </>
          )}

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={
                submitting || uploading || !selectedStudent || loadingProfile
              }
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : uploading
                  ? "Uploading..."
                  : "Apply on Behalf"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageApplicationsByJobView({
  basePath,
  selectedJobId,
}) {
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [searchApplicant, setSearchApplicant] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [cloudDriveFilter, setCloudDriveFilter] = useState("all");
  const [applicationMonthFilter, setApplicationMonthFilter] = useState("all");
  const [applicationDateSort, setApplicationDateSort] = useState("latest");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [selectedStudentAppliedJobs, setSelectedStudentAppliedJobs] = useState(
    [],
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [favoriteStudentIds, setFavoriteStudentIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const statusDropdownRef = useRef(null);

  // ── Search + Sort (jobs grid only) ────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [jobExperienceFilters, setJobExperienceFilters] = useState([]);
  const [jobEntryLevelFilters, setJobEntryLevelFilters] = useState([]);

  const refresh = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [all, allJobs, favoriteIds] = await Promise.all([
        listAllApplications(),
        listJobs(),
        listFavoriteStudents(),
      ]);
      setRows(Array.isArray(all) ? all : []);
      setJobs(Array.isArray(allJobs) ? allJobs : []);
      setFavoriteStudentIds(Array.isArray(favoriteIds) ? favoriteIds : []);
    } catch (error) {
      setRows([]);
      setJobs([]);
      setFavoriteStudentIds([]);
      setLoadError(error?.message || "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const statusFilterLabel =
    statusFilters.length === 0
      ? "All Statuses"
      : statusFilters.length === 1
        ? statusFilters[0]
        : `${statusFilters.length} statuses selected`;

  const toggleStatusFilter = (status) => {
    setStatusFilters((prev) => toggleMultiValue(prev, status));
  };

  const onStatusChange = async (id, status) => {
    const prevRow = rows.find((r) => r.id === id) || null;
    const nextStage = getStageFromStatus(status);
    setRows((cur) =>
      cur.map((r) =>
        r.id === id ? { ...r, status, sub_stage: status, stage: nextStage } : r,
      ),
    );
    try {
      await updateApplicationStatus(id, status, {
        stage: nextStage,
        subStage: status,
      });
    } catch (err) {
      setRows((cur) =>
        cur.map((r) => (r.id === id && prevRow ? { ...r, ...prevRow } : r)),
      );
      await showError(err?.message || "Failed to update status");
    }
  };
  const onCommentChange = async (id, comment, comment2, options = {}) => {
    try {
      await updateApplicationComment(id, comment, comment2, options);
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                hr_comment: comment || null,
                hr_comment_2: comment2 || null,
              }
            : r,
        ),
      );
    } catch {
      /* silent */
    }
  };

  const onGenerateAiComment = async (id, options = {}) => {
    try {
      return await generateAiCommentSuggestion(id, options);
    } catch (err) {
      await showError(err?.message || "Failed to generate AI suggestion");
      return null;
    }
  };

  const onDeleteApplication = async (id, studentName) => {
    const confirmed = await confirmDanger({
      title: "Delete this application?",
      text: `${studentName || "This student"}'s application will be removed from admin and student views.`,
      confirmButtonText: "Delete application",
      cancelButtonText: "Keep",
    });
    if (!confirmed) return;

    setRows((current) => current.filter((row) => row.id !== id));

    try {
      await deleteApplication(id);
    } catch (err) {
      await refresh();
      await showError(err?.message || "Failed to delete application");
    }
  };
  const jobsById = useMemo(
    () => new Map((jobs || []).map((job) => [String(job.id), job])),
    [jobs],
  );
  const normalizedRows = useMemo(
    () => rows.map((row) => mapApplicationRow(row, jobsById)),
    [rows, jobsById],
  );

  const openStudentProfile = (row) => {
    const studentId = String(row.studentId || "").trim();
    if (!studentId) return;

    const matchingRows = normalizedRows.filter(
      (item) => String(item.studentId || "") === studentId,
    );

    const source = matchingRows[0] || row;
    setSelectedStudentProfile({
      id: studentId,
      fullName: source.studentName || "Student",
      email: source.studentEmail || "",
      phone: source.studentPhone || "",
      location: source.studentLocation || "",
      preferredLocation: source.studentPreferredLocation || "",
      isEligible: Boolean(source.studentIsEligible),
      eligibleUntil: source.studentEligibleUntil || null,
      currentCtc: source.currentCTC || null,
      expectedCtc: source.expectedCTC || null,
      totalExperience: source.totalExperience || null,
      cloudDriveStatus: source.studentCloudDriveStatus || null,
      driveClearedDate: source.driveClearedDate || null,
      cloudDriveHistory: source.studentCloudDriveHistory || [],
    });

    const appliedJobs = matchingRows
      .map((item) => ({
        applicationId: item.id,
        jobId: item.job_id,
        company: item.job?.company || item.jobs?.company || "-",
        title: item.jobTitle || item.job?.title || item.jobs?.title || "-",
        status: item.sub_stage || item.status || "Applied",
        appliedAt: item.appliedAt || null,
      }))
      .sort(
        (a, b) =>
          new Date(b.appliedAt || 0).getTime() -
          new Date(a.appliedAt || 0).getTime(),
      );
    setSelectedStudentAppliedJobs(appliedJobs);
    setProfileModalOpen(true);
  };

  const closeStudentProfile = () => {
    setProfileModalOpen(false);
    setSelectedStudentProfile(null);
    setSelectedStudentAppliedJobs([]);
  };

  const saveStudentCloudDriveProfile = async ({ cloudDriveHistory }) => {
    if (!selectedStudentProfile?.id) return;

    try {
      setProfileSaving(true);
      const updated = await updateStudentCloudDriveProfile(
        selectedStudentProfile.id,
        {
          cloudDriveHistory,
        },
      );

      setRows((prev) =>
        prev.map((row) =>
          String(row.student?.id || row.student_id || "") ===
          String(selectedStudentProfile.id)
            ? {
                ...row,
                student: {
                  ...(row.student || {}),
                  cloud_drive_status: updated?.cloud_drive_status ?? null,
                  drive_cleared_date: updated?.drive_cleared_date ?? null,
                  cloud_drive_status_history:
                    updated?.cloud_drive_status_history || [],
                },
                profiles: {
                  ...(row.profiles || {}),
                  cloud_drive_status: updated?.cloud_drive_status ?? null,
                  drive_cleared_date: updated?.drive_cleared_date ?? null,
                  cloud_drive_status_history:
                    updated?.cloud_drive_status_history || [],
                },
              }
            : row,
        ),
      );

      setSelectedStudentProfile((prev) =>
        prev
          ? {
              ...prev,
              cloudDriveStatus: updated?.cloud_drive_status ?? null,
              driveClearedDate: updated?.drive_cleared_date ?? null,
              cloudDriveHistory: updated?.cloud_drive_status_history || [],
            }
          : prev,
      );
      setProfileModalOpen(false);
    } catch (error) {
      await showError(
        error?.message || "Failed to update cloud drive profile fields",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // Build raw job cards from applications
  const jobCards = useMemo(() => {
    const jobsMap = new Map();
    for (const row of normalizedRows) {
      const jobId = getJobId(row);
      if (!jobId) continue;
      const existing = jobsMap.get(jobId);
      if (!existing) {
        const classified = classifyJobExperience(
          row.jobs?.experience || row.job?.experience || "",
        );
        jobsMap.set(jobId, {
          id: jobId,
          title: getJobTitle(row),
          company: row.jobs?.company || row.company || "-",
          experience: row.jobs?.experience || row.job?.experience || "",
          experienceBucket: classified.bucket,
          entryTags: classified.entryTags,
          createdAt: row.jobs?.created_at || row.job?.created_at || null,
          status: normalizeJobStatus(row.jobs?.status || row.job?.status),
          applicationsCount: 1,
        });
      } else {
        if (!existing.createdAt)
          existing.createdAt =
            row.jobs?.created_at || row.job?.created_at || null;
        if (existing.status === "closed")
          existing.status = normalizeJobStatus(
            row.jobs?.status || row.job?.status,
          );
        existing.applicationsCount += 1;
      }
    }
    return Array.from(jobsMap.values());
  }, [normalizedRows]);

  // Filter by search + sort by date
  const filteredJobCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? jobCards.filter(
          (j) =>
            j.title?.toLowerCase().includes(q) ||
            j.company?.toLowerCase().includes(q),
        )
      : jobCards;

    const byExperience = jobExperienceFilters.length
      ? filtered.filter(
          (job) =>
            job.experienceBucket &&
            jobExperienceFilters.includes(String(job.experienceBucket)),
        )
      : filtered;

    const byEntryLevel = jobEntryLevelFilters.length
      ? byExperience.filter(
          (job) =>
            Array.isArray(job.entryTags) &&
            job.entryTags.some((tag) => jobEntryLevelFilters.includes(tag)),
        )
      : byExperience;

    return [...byEntryLevel].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "newest" ? db - da : da - db;
    });
  }, [jobCards, search, sortOrder, jobExperienceFilters, jobEntryLevelFilters]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading applications...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="text-sm font-semibold text-rose-700">
          Could not load manage applications.
        </div>
        <div className="text-sm text-rose-700">{loadError}</div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Jobs grid ─────────────────────────────────────────────────────────────
  if (!selectedJobId) {
    return (
      <div className="space-y-4">
        {/* Top row: title + refresh */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold text-slate-900">
            Posted Jobs
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Search + Sort controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title or company..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Job Experience (Multi-select)
            </span>
            <div className="flex flex-wrap gap-2">
              {JOB_EXPERIENCE_BUCKETS.map((option) => {
                const active = jobExperienceFilters.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setJobExperienceFilters((prev) =>
                        toggleMultiValue(prev, option.id),
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setJobExperienceFilters([])}
              disabled={jobExperienceFilters.length === 0}
              className="mt-2 text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Clear Experience Filter
            </button>
          </div>

          <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Internship / Fresher
            </span>
            <div className="flex flex-wrap gap-2">
              {ENTRY_LEVEL_TAGS.map((option) => {
                const active = jobEntryLevelFilters.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setJobEntryLevelFilters((prev) =>
                        toggleMultiValue(prev, option.id),
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setJobEntryLevelFilters([])}
              disabled={jobEntryLevelFilters.length === 0}
              className="mt-2 text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Clear Internship/Fresher Filter
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSortOrder("newest");
              setJobExperienceFilters([]);
              setJobEntryLevelFilters([]);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            Clear All Job Filters
          </button>

          {/* Sort toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setSortOrder("newest")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sortOrder === "newest" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
            >
              Newest First
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("oldest")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sortOrder === "oldest" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
            >
              Oldest First
            </button>
          </div>
        </div>

        {/* Result count */}
        {search && (
          <p className="text-xs text-slate-500">
            {filteredJobCards.length === 0
              ? "No jobs match your search."
              : `Showing ${filteredJobCards.length} of ${jobCards.length} job${jobCards.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Grid */}
        {filteredJobCards.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {search ? (
              <span>
                No jobs found for "<span className="font-medium">{search}</span>
                ".{" "}
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="font-semibold text-primary hover:underline"
                >
                  Clear search
                </button>
              </span>
            ) : (
              "No posted jobs with applications yet."
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobCards.map((job) => (
              <Link
                key={job.id}
                to={`${basePath}/${job.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold text-slate-900">
                    {job.title}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getJobStatusChipClasses(job.status)}`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">{job.company}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Posted: {formatPostedDate(job.createdAt)}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {job.applicationsCount} Applied
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Single job: applicants view ───────────────────────────────────────────
  const filteredRows = normalizedRows.filter(
    (row) => String(getJobId(row)) === String(selectedJobId),
  );
  const selectedJob = jobs.find((j) => String(j.id) === String(selectedJobId));
  const selectedJobTitle =
    filteredRows[0]?.jobTitle || selectedJob?.title || "Job";
  const selectedJobCompany =
    filteredRows[0]?.job?.company ||
    filteredRows[0]?.jobs?.company ||
    selectedJob?.company ||
    "";
  const selectedJobJdLink = String(
    filteredRows[0]?.job?.jd_link ||
      filteredRows[0]?.jobs?.jd_link ||
      selectedJob?.jd_link ||
      "",
  ).trim();
  const selectedJobRows = filteredRows
    .filter((row) => {
      const q = searchApplicant.trim().toLowerCase();
      if (q) {
        const inName = String(row.studentName || "")
          .toLowerCase()
          .includes(q);
        const inEmail = String(row.studentEmail || "")
          .toLowerCase()
          .includes(q);
        if (!inName && !inEmail) return false;
      }

      const expYears = parseExperienceYears(row.totalExperience);
      if (
        experienceFilter === "fresher" &&
        (expYears === null || expYears > 0)
      ) {
        return false;
      }
      if (
        experienceFilter === "experienced" &&
        (expYears === null || expYears <= 0)
      ) {
        return false;
      }

      if (eligibilityFilter === "eligible" && !row.studentIsEligible)
        return false;
      if (eligibilityFilter === "not-eligible" && row.studentIsEligible)
        return false;

      const applicationStatus = String(
        row.sub_stage || row.status || "",
      ).trim();
      if (
        statusFilters.length > 0 &&
        !statusFilters.includes(applicationStatus)
      ) {
        return false;
      }

      const cloudStatus = String(row.studentCloudDriveStatus || "").trim();
      const clearedCloudStatuses = [
        "Cleared",
        "Practical Online Task Round Cleared",
        "Face-to-Face Round (Live Interview) Cleared",
        "Managerial Round Cleared",
        "Cleared AWS Drive",
        "Cleared DevOps Drive",
      ];
      if (cloudDriveFilter === "cleared") {
        if (!clearedCloudStatuses.includes(cloudStatus)) {
          return false;
        }
      }
      if (cloudDriveFilter === "not-cleared") {
        if (clearedCloudStatuses.includes(cloudStatus)) {
          return false;
        }
      }

      if (applicationMonthFilter !== "all") {
        if (monthKey(row.appliedAt) !== applicationMonthFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.appliedAt || 0).getTime();
      const bTime = new Date(b.appliedAt || 0).getTime();
      return applicationDateSort === "oldest" ? aTime - bTime : bTime - aTime;
    });

  const toggleStudentSelection = (studentId, checked) => {
    if (!studentId) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return [...next];
    });
  };

  const toggleAllStudents = (checked) => {
    if (!checked) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(
      selectedJobRows.map((row) => row.studentId).filter(Boolean),
    );
  };

  const toggleFavorite = async (studentId) => {
    if (!studentId) return;
    try {
      const isFav = favoriteStudentIds.includes(studentId);
      if (isFav) {
        const next = await removeFavoriteStudents([studentId]);
        setFavoriteStudentIds(Array.isArray(next) ? next : []);
      } else {
        const next = await addFavoriteStudents([studentId]);
        setFavoriteStudentIds(Array.isArray(next) ? next : []);
      }
    } catch (error) {
      await showError(error?.message || "Failed to update favorite student");
    }
  };

  const addSelectedToFavorites = async () => {
    if (selectedStudentIds.length === 0) {
      await showError("Select at least one student from the application list.");
      return;
    }

    try {
      const next = await addFavoriteStudents(selectedStudentIds);
      setFavoriteStudentIds(Array.isArray(next) ? next : []);
      setSelectedStudentIds([]);
    } catch (error) {
      await showError(
        error?.message || "Failed to add selected students to favorites",
      );
    }
  };

  const monthOptions = [
    ...new Set(
      filteredRows.map((row) => monthKey(row.appliedAt)).filter(Boolean),
    ),
  ].sort((a, b) => (a > b ? -1 : 1));

  return (
    <div className="space-y-4 min-w-0">
      <StudentProfileModal
        open={profileModalOpen}
        onClose={closeStudentProfile}
        student={selectedStudentProfile}
        appliedJobs={selectedStudentAppliedJobs}
        saving={profileSaving}
        onSave={saveStudentCloudDriveProfile}
      />
      {showApplyModal && (
        <ApplyOnBehalfModal
          job={selectedJob}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => refresh()}
        />
      )}
      <div>
        <Link
          to={basePath}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to jobs
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
          <span>
            Applied Candidates: {selectedJobTitle}
            {selectedJobCompany ? ` @ ${selectedJobCompany}` : ""}
          </span>
          {selectedJobJdLink ? (
            <a
              href={selectedJobJdLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
            >
              JD
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addSelectedToFavorites}
            disabled={selectedStudentIds.length === 0}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Selected to Favourites
          </button>
          <button
            type="button"
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <FiUserPlus className="h-4 w-4" />
            Apply on Behalf
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-7">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Search Candidate
          </span>
          <input
            type="text"
            value={searchApplicant}
            onChange={(event) => setSearchApplicant(event.target.value)}
            placeholder="Name or email"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Experience
          </span>
          <select
            value={experienceFilter}
            onChange={(event) => setExperienceFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="fresher">Fresher</option>
            <option value="experienced">Experienced</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Eligibility
          </span>
          <select
            value={eligibilityFilter}
            onChange={(event) => setEligibilityFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="eligible">Eligible</option>
            <option value="not-eligible">Not Eligible</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Cloud Drive
          </span>
          <select
            value={cloudDriveFilter}
            onChange={(event) => setCloudDriveFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="cleared">Cleared</option>
            <option value="not-cleared">Not Cleared</option>
          </select>
        </label>
        <div className="relative block" ref={statusDropdownRef}>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Status (Multi-select)
          </span>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition hover:border-primary focus:border-primary"
          >
            <span className="truncate">{statusFilterLabel}</span>
            <FiChevronDown
              className={`h-4 w-4 text-slate-500 transition ${statusDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {statusDropdownOpen ? (
            <div className="absolute z-20 mt-1 max-h-56 w-[220px] overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {APPLICATION_STATUSES.map((status) => {
                const checked = statusFilters.includes(status);
                return (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatusFilter(status)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setStatusFilters([])}
            disabled={statusFilters.length === 0}
            className="mt-1 text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Clear status filter
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Application Month
          </span>
          <select
            value={applicationMonthFilter}
            onChange={(event) => setApplicationMonthFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">All</option>
            {monthOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Sort by Applied Date
          </span>
          <select
            value={applicationDateSort}
            onChange={(event) => setApplicationDateSort(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </label>
      </div>
      <ApplicationsTable
        rows={selectedJobRows}
        onStatusChange={onStatusChange}
        onCommentChange={onCommentChange}
        onGenerateAiComment={onGenerateAiComment}
        onDeleteApplication={onDeleteApplication}
        onStudentClick={openStudentProfile}
        selectable
        selectedRowIds={selectedStudentIds}
        onToggleRow={toggleStudentSelection}
        onToggleAll={toggleAllStudents}
        favoriteRowIds={favoriteStudentIds}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
