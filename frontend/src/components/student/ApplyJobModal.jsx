import { useCallback, useEffect, useMemo, useState } from "react";
import { FiUpload, FiSave, FiAlertCircle } from "react-icons/fi";
import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";
import {
  createApplication,
  listApplicationsByStudent,
} from "../../services/applicationService";
import {
  deleteResume,
  listMyResumes,
  uploadResumes,
} from "../../services/resumeService";
import { showError, showInfo, showSuccess } from "../../utils/alerts";

const MAX_RESUMES = 3;

function getMostRecentApplication(applications = [], currentJobId) {
  const rows = Array.isArray(applications) ? applications : [];
  const filtered = rows.filter((row) => {
    const rowJobId = row?.job_id || row?.jobId;
    return currentJobId ? String(rowJobId) !== String(currentJobId) : true;
  });
  if (filtered.length === 0) return null;
  return [...filtered].sort(
    (a, b) =>
      new Date(b?.updated_at || b?.created_at || 0).getTime() -
      new Date(a?.updated_at || a?.created_at || 0).getTime(),
  )[0];
}

// ── Yes/No Toggle ─────────────────────────────────────────────────────────────

function YesNoToggle({ value, onChange, error }) {
  return (
    <div className={`inline-flex rounded-xl border p-1 ${error ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <button type="button" onClick={() => onChange(true)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${value === true ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}>
        Yes
      </button>
      <button type="button" onClick={() => onChange(false)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${value === false ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}>
        No
      </button>
    </div>
  );
}

function QuestionToggle({ label, sublabel, value, onChange, error }) {
  return (
    <div>
      <div className={`mb-0.5 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}>{label}</div>
      {sublabel && <div className="mb-2 text-xs text-slate-500">{sublabel}</div>}
      {!sublabel && <div className="mb-2" />}
      <YesNoToggle value={value} onChange={onChange} error={error} />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <FiAlertCircle className="h-3 w-3" /> Required
        </p>
      )}
    </div>
  );
}

// ── Custom question field rendered for student ────────────────────────────────

function CustomQuestionField({ question, index, value, onChange, error }) {
  const isYesNo = question.answer_type === "yesno";
  return (
    <div className="col-span-2">
      <div className={`mb-1 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}>
        Q{index + 1}. {question.question}
        <span className="ml-1 text-red-500">*</span>
      </div>
      {isYesNo ? (
        <>
          <YesNoToggle value={typeof value === "boolean" ? value : null} onChange={onChange} error={error} />
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <FiAlertCircle className="h-3 w-3" /> Required
            </p>
          )}
        </>
      ) : (
        <>
          <textarea
            rows={2}
            placeholder="Type your answer here..."
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${error ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
          />
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <FiAlertCircle className="h-3 w-3" /> Required
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Save-for-future confirmation modal ────────────────────────────────────────

function SaveForFutureModal({ open, form, onConfirm, onSkip }) {
  if (!open) return null;

  const rows = [
    { label: "Currently Working",             value: form.isCurrentlyWorking === true ? "Yes" : form.isCurrentlyWorking === false ? "No" : "—" },
    form.isCurrentlyWorking && { label: "Notice Period", value: form.noticePeriod || "—" },
    { label: "Total Experience",              value: form.totalExperience ? `${form.totalExperience} yr${Number(form.totalExperience) === 1 ? "" : "s"}` : "—" },
    { label: "Relevant Experience as per JD", value: form.relevantExperience || "—" },
    { label: "Current CTC (in LPA)",          value: form.currentCTC || "—" },
    { label: "Expected CTC",                  value: form.expectedCTC || "—" },
    { label: "Hands-on Skills",               value: form.handsOnPrimarySkills === true ? "Yes" : form.handsOnPrimarySkills === false ? "No" : "—" },
    { label: "Work Mode Match",               value: form.workModeMatch === true ? "Yes" : form.workModeMatch === false ? "No" : "—" },
    { label: "Interview Available",           value: form.interviewModeAvailable === true ? "Yes" : form.interviewModeAvailable === false ? "No" : "—" },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <FiSave className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-slate-900">Save Details for Future?</h3>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          The following details will be pre-filled in your next application:
        </p>
        <div className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-slate-800">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={onConfirm}>Yes, Save</Button>
          <Button variant="outline" className="flex-1" onClick={onSkip}>Skip</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ApplyJobModal({ open, onClose, job, profile, onApplied }) {
  const [resumes,       setResumes]       = useState([]);
  const [uploading,     setUploading]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [touched,       setTouched]       = useState({});
  const [submitted,     setSubmitted]     = useState(false);
  // answers keyed by question.id → string (free text) | boolean (yesno)
  const [answers, setAnswers] = useState({});

  const [form, setForm] = useState({
    isCurrentlyWorking:     null,
    noticePeriod:           "",
    totalExperience:        "",
    relevantExperience:     "",
    handsOnPrimarySkills:   null,
    workModeMatch:          null,
    interviewModeAvailable: null,
    currentCTC:             "",
    expectedCTC:            "",
    selectedResumeUrl:      "",
    jdConfirmed:            false,
  });

  // ── job-level derived values ──────────────────────────────────────────────

  const jobWorkMode      = job?.work_mode      || job?.workMode      || "";
  const jobExperience    = job?.experience     || job?.required_experience || "";
  const jobQuestions     = useMemo(() => Array.isArray(job?.questions) ? job.questions : [], [job]);

  // interview_mode is now text[] — join for display
  const interviewModeDisplay = useMemo(() => {
    const raw = job?.interview_mode || job?.interviewMode;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string") return raw;
    return "";
  }, [job]);

  const selectedSkills = useMemo(() => {
    if (Array.isArray(job?.skills)) return job.skills.join(", ");
    if (typeof job?.skills === "string") return job.skills;
    return "";
  }, [job]);

  // ── form builder ─────────────────────────────────────────────────────────

  const buildFormFromSources = useCallback(
    ({ previousApplication, resumeRows }) => {
      const safeResumes       = Array.isArray(resumeRows) ? resumeRows : [];
      const previousResumeUrl = previousApplication?.selected_resume_url || previousApplication?.selectedResumeUrl || "";
      const hasPreviousResume = safeResumes.some((r) => r?.file_url === previousResumeUrl);

      return {
        isCurrentlyWorking:
          typeof previousApplication?.is_currently_working === "boolean"
            ? previousApplication.is_currently_working
            : typeof previousApplication?.isCurrentlyWorking === "boolean"
              ? previousApplication.isCurrentlyWorking
              : typeof profile?.isCurrentlyWorking === "boolean"
                ? profile.isCurrentlyWorking
                : null,
        noticePeriod:           previousApplication?.notice_period    || previousApplication?.noticePeriod    || "",
        totalExperience:        previousApplication?.total_experience  || previousApplication?.totalExperience  || profile?.totalExperience || profile?.experienceYears || "",
        relevantExperience:     previousApplication?.relevant_experience || previousApplication?.relevantExperience || "",
        handsOnPrimarySkills:
          typeof previousApplication?.hands_on_primary_skills === "boolean"
            ? previousApplication.hands_on_primary_skills
            : typeof previousApplication?.handsOnPrimarySkills === "boolean"
              ? previousApplication.handsOnPrimarySkills
              : null,
        workModeMatch:
          typeof previousApplication?.work_mode_match === "boolean"
            ? previousApplication.work_mode_match
            : typeof previousApplication?.workModeMatch === "boolean"
              ? previousApplication.workModeMatch
              : null,
        interviewModeAvailable:
          typeof previousApplication?.interview_mode_available === "boolean"
            ? previousApplication.interview_mode_available
            : typeof previousApplication?.interviewModeAvailable === "boolean"
              ? previousApplication.interviewModeAvailable
              : null,
        currentCTC:       previousApplication?.current_ctc  || previousApplication?.currentCTC  || profile?.currentCTC  || "",
        expectedCTC:      previousApplication?.expected_ctc || previousApplication?.expectedCTC || profile?.expectedCTC || "",
        selectedResumeUrl: hasPreviousResume ? previousResumeUrl : "",
        jdConfirmed: false,
      };
    },
    [profile],
  );

  useEffect(() => {
    if (!open) return;
    setTouched({});
    setSubmitted(false);
    setShowSaveModal(false);
    setAnswers({});

    const init = async () => {
      const [resumeRows, applicationRows] = await Promise.all([listMyResumes(), listApplicationsByStudent()]);
      const safeResumes         = Array.isArray(resumeRows) ? resumeRows : [];
      const previousApplication = getMostRecentApplication(applicationRows, job?.id);
      setResumes(safeResumes);
      setForm(buildFormFromSources({ previousApplication, resumeRows: safeResumes }));
    };

    init().catch(() => {
      setResumes([]);
      setForm(buildFormFromSources({ previousApplication: null, resumeRows: [] }));
    });
  }, [open, job?.id, buildFormFromSources]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updateAnswer = (qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }));

  // ── resume handlers ───────────────────────────────────────────────────────

  const handleUploadResumes = async (files) => {
    if (!files?.length) return;
    if (resumes.length >= MAX_RESUMES) {
      await showInfo("Maximum 3 resumes allowed. Please delete an existing resume before uploading a new one.", "Resume Limit Reached");
      return;
    }
    const remaining = MAX_RESUMES - resumes.length;
    const accepted  = files.slice(0, remaining);
    if (files.length > accepted.length) {
      await showInfo(`Only ${remaining} more resume(s) can be uploaded. Extra files were ignored.`, "Resume Limit");
    }
    setUploading(true);
    try {
      await uploadResumes(accepted);
      const rows = await listMyResumes();
      setResumes(rows || []);
    } catch (err) {
      await showError(err?.message || "Failed to upload resume", "Upload Failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async (resume) => {
    if (!resume?.id) return;
    setUploading(true);
    try {
      await deleteResume(resume.id);
      const rows = await listMyResumes();
      setResumes(rows || []);
      if (form.selectedResumeUrl === resume.file_url) update({ selectedResumeUrl: "" });
    } catch (err) {
      await showError(err?.message || "Failed to delete resume", "Delete Failed");
    } finally {
      setUploading(false);
    }
  };

  // ── validation ────────────────────────────────────────────────────────────

  const errors = useMemo(() => {
    const e = {};
    if (typeof form.isCurrentlyWorking !== "boolean")                             e.isCurrentlyWorking     = true;
    if (form.isCurrentlyWorking && !String(form.noticePeriod || "").trim())       e.noticePeriod           = true;
    if (!String(form.totalExperience    || "").trim())                            e.totalExperience        = true;
    if (!String(form.relevantExperience || "").trim())                            e.relevantExperience     = true;
    if (typeof form.handsOnPrimarySkills   !== "boolean")                         e.handsOnPrimarySkills   = true;
    if (typeof form.workModeMatch          !== "boolean")                         e.workModeMatch          = true;
    if (typeof form.interviewModeAvailable !== "boolean")                         e.interviewModeAvailable = true;
    if (!String(form.currentCTC  || "").trim())                                   e.currentCTC             = true;
    if (!String(form.expectedCTC || "").trim())                                   e.expectedCTC            = true;
    if (!String(form.selectedResumeUrl || "").trim())                             e.selectedResumeUrl      = true;
    if (!form.jdConfirmed)                                                        e.jdConfirmed            = true;

    // validate each custom question answer
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

  const hasErrors = Object.keys(errors).length > 0;
  const show      = (field) => submitted || touched[field];

  // ── submit flow ───────────────────────────────────────────────────────────

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) {
      await showInfo("Please fill all required fields highlighted in red.", "Incomplete Application");
      return;
    }
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => { setShowSaveModal(false); await submitApplication(true);  };
  const handleSaveSkip    = async () => { setShowSaveModal(false); await submitApplication(false); };

  const submitApplication = async (saveForFuture) => {
    setSubmitting(true);
    try {
      // Build answers payload for backend
      const answersPayload = jobQuestions.map((q) => ({
        questionId: q.id,
        answerType: q.answer_type,
        answer:     answers[q.id] ?? null,
      }));

      await createApplication({
        jobId:                  job.id,
        isCurrentlyWorking:     form.isCurrentlyWorking,
        noticePeriod:           form.noticePeriod,
        totalExperience:        form.totalExperience,
        relevantExperience:     form.relevantExperience,
        handsOnPrimarySkills:   form.handsOnPrimarySkills,
        workModeMatch:          form.workModeMatch,
        interviewModeAvailable: form.interviewModeAvailable,
        currentCTC:             form.currentCTC,
        expectedCTC:            form.expectedCTC,
        selectedResumeUrl:      form.selectedResumeUrl,
        jdConfirmed:            form.jdConfirmed,
        saveForFuture,
        answers:                answersPayload,   // ← new
      });

      await showSuccess("Application submitted successfully.", "Applied");
      await onApplied?.();
      onClose?.();
    } catch (err) {
      await showError(err?.message || "Failed to apply", "Apply Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        title={`Apply for ${job?.title || "Job"}`}
        open={open}
        onClose={onClose}
        maxWidthClass="max-w-[1000px]"
        scrollable
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="apply-job-form" disabled={submitting || uploading} className="min-w-40">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        }
      >
        <form id="apply-job-form" onSubmit={handleSubmit} className="space-y-5">

          {/* Job details */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div><span className="font-semibold text-slate-900">Company:</span> {job?.company || "—"}</div>
              <div><span className="font-semibold text-slate-900">Work Mode:</span> {jobWorkMode || "Not specified"}</div>
              <div><span className="font-semibold text-slate-900">Experience Required:</span> {jobExperience || "Not specified"}</div>
              <div>
                <span className="font-semibold text-slate-900">Interview Mode:</span>{" "}
                {interviewModeDisplay || "Not specified"}
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold text-slate-900">JD Skills:</span> {selectedSkills || "Not specified"}
              </div>
            </div>
          </section>

          {/* Form fields */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <QuestionToggle
              label="Are you currently working?"
              value={form.isCurrentlyWorking}
              onChange={(value) => { setTouched((p) => ({ ...p, isCurrentlyWorking: true })); update({ isCurrentlyWorking: value, noticePeriod: value ? form.noticePeriod : "" }); }}
              error={show("isCurrentlyWorking") && errors.isCurrentlyWorking}
            />

            {form.isCurrentlyWorking ? (
              <Input
                label="Notice Period"
                value={form.noticePeriod}
                onChange={(e) => { setTouched((p) => ({ ...p, noticePeriod: true })); update({ noticePeriod: e.target.value }); }}
                placeholder="e.g. 30 days"
                error={show("noticePeriod") && errors.noticePeriod ? "Required" : ""}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Notice period field appears only for currently working candidates.
              </div>
            )}

            {/* Total experience — range slider 1‒20 years */}
            <div>
              <div className={`mb-1.5 text-sm font-medium ${show("totalExperience") && errors.totalExperience ? "text-red-600" : "text-slate-700"}`}>
                Total Experience
                {show("totalExperience") && errors.totalExperience && (
                  <span className="ml-2 text-xs font-normal text-red-500">— Required</span>
                )}
              </div>
              <div className={`rounded-xl border px-4 py-3 ${show("totalExperience") && errors.totalExperience ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Years</span>
                  <span className="font-semibold text-slate-900">
                    {form.totalExperience ? `${form.totalExperience} yr${Number(form.totalExperience) === 1 ? "" : "s"}` : "Select"}
                  </span>
                </div>
                <input
                  type="range" min={1} max={20} step={1}
                  value={form.totalExperience || 1}
                  onChange={(e) => { setTouched((p) => ({ ...p, totalExperience: true })); update({ totalExperience: e.target.value }); }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>1 yr</span><span>20 yrs</span>
                </div>
              </div>
            </div>

            <Input
              label="Relevant Experience as per JD"
              value={form.relevantExperience}
              onChange={(e) => { setTouched((p) => ({ ...p, relevantExperience: true })); update({ relevantExperience: e.target.value }); }}
              placeholder="e.g. 2 years in React"
              error={show("relevantExperience") && errors.relevantExperience ? "Required" : ""}
            />

            <QuestionToggle
              label={selectedSkills ? `Are you hands-on with: ${selectedSkills}?` : "Are you hands-on with the required skills?"}
              sublabel={selectedSkills ? "Skills listed in the Job Description" : undefined}
              value={form.handsOnPrimarySkills}
              onChange={(value) => { setTouched((p) => ({ ...p, handsOnPrimarySkills: true })); update({ handsOnPrimarySkills: value }); }}
              error={show("handsOnPrimarySkills") && errors.handsOnPrimarySkills}
            />

            <QuestionToggle
              label={jobWorkMode ? `Are you comfortable with ${jobWorkMode} work mode?` : "Work mode preference match?"}
              sublabel={jobWorkMode ? `This role requires ${jobWorkMode}` : undefined}
              value={form.workModeMatch}
              onChange={(value) => { setTouched((p) => ({ ...p, workModeMatch: true })); update({ workModeMatch: value }); }}
              error={show("workModeMatch") && errors.workModeMatch}
            />

            <QuestionToggle
              label={interviewModeDisplay ? `Are you available for a ${interviewModeDisplay} interview?` : "Are you available for the interview?"}
              sublabel={interviewModeDisplay ? `Interview mode: ${interviewModeDisplay}` : undefined}
              value={form.interviewModeAvailable}
              onChange={(value) => { setTouched((p) => ({ ...p, interviewModeAvailable: true })); update({ interviewModeAvailable: value }); }}
              error={show("interviewModeAvailable") && errors.interviewModeAvailable}
            />

            <div className="hidden md:block" />

            <Input
              label="Current CTC (in LPA)"
              value={form.currentCTC}
              onChange={(e) => { setTouched((p) => ({ ...p, currentCTC: true })); update({ currentCTC: e.target.value }); }}
              placeholder="e.g. 4.5 LPA"
              error={show("currentCTC") && errors.currentCTC ? "Required" : ""}
            />
            <Input
              label="Expected CTC (in LPA)"
              value={form.expectedCTC}
              onChange={(e) => { setTouched((p) => ({ ...p, expectedCTC: true })); update({ expectedCTC: e.target.value }); }}
              placeholder="e.g. 6.5 LPA"
              error={show("expectedCTC") && errors.expectedCTC ? "Required" : ""}
            />

            {/* Custom questions from HR — rendered only when job has them */}
            {jobQuestions.length > 0 && (
              <>
                <div className="col-span-2 border-t border-slate-200 pt-3">
                  <p className="text-sm font-semibold text-slate-800">Additional Questions</p>
                  <p className="text-xs text-slate-500">Please answer all questions below.</p>
                </div>
                {jobQuestions.map((q, i) => (
                  <CustomQuestionField
                    key={q.id}
                    question={q}
                    index={i}
                    value={answers[q.id]}
                    onChange={(val) => {
                      setTouched((p) => ({ ...p, [`answer_${q.id}`]: true }));
                      updateAnswer(q.id, val);
                    }}
                    error={show(`answer_${q.id}`) && errors[`answer_${q.id}`]}
                  />
                ))}
              </>
            )}

          </section>

          {/* Resume selector */}
          <section className={`rounded-xl border p-4 ${show("selectedResumeUrl") && errors.selectedResumeUrl ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold ${show("selectedResumeUrl") && errors.selectedResumeUrl ? "text-red-700" : "text-slate-900"}`}>
                  Resume Selector
                  {show("selectedResumeUrl") && errors.selectedResumeUrl && (
                    <span className="ml-2 text-xs font-normal text-red-600">— Please select a resume</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Choose one resume (max {MAX_RESUMES}).{" "}
                  {resumes.length >= MAX_RESUMES && (
                    <span className="font-semibold text-amber-600">Limit reached — delete one to upload a new resume.</span>
                  )}
                </div>
              </div>
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${resumes.length >= MAX_RESUMES || uploading ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"}`}>
                <FiUpload className="h-4 w-4" />
                Upload Resume
                <input type="file" className="hidden" multiple
                  onChange={(e) => handleUploadResumes(Array.from(e.target.files || []))}
                  disabled={uploading || resumes.length >= MAX_RESUMES} />
              </label>
            </div>

            <div className="mt-3 space-y-2">
              {resumes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No resumes uploaded. Upload at least one resume to apply.
                </div>
              ) : (
                resumes.map((resume) => (
                  <label key={resume.id || resume.file_url} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <input type="radio" name="selectedResume"
                        checked={form.selectedResumeUrl === resume.file_url}
                        onChange={() => { setTouched((p) => ({ ...p, selectedResumeUrl: true })); update({ selectedResumeUrl: resume.file_url }); }} />
                      <span className="truncate text-sm text-slate-800">{resume.file_name || "Resume"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={resume.signed_url || resume.file_url} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:text-primaryDark">View</a>
                      <button type="button" onClick={() => handleDeleteResume(resume)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>

          {/* JD confirmed */}
          <section className="space-y-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${show("jdConfirmed") && errors.jdConfirmed ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <input type="checkbox" checked={form.jdConfirmed}
                onChange={(e) => { setTouched((p) => ({ ...p, jdConfirmed: true })); update({ jdConfirmed: e.target.checked }); }}
                className="mt-1" />
              <span>
                I have read the Job Description fully.
                {show("jdConfirmed") && errors.jdConfirmed && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <FiAlertCircle className="h-3 w-3" /> Required
                  </span>
                )}
              </span>
            </label>
          </section>

        </form>
      </Modal>

      <SaveForFutureModal
        open={showSaveModal}
        form={form}
        onConfirm={handleSaveConfirm}
        onSkip={handleSaveSkip}
      />
    </>
  );
}