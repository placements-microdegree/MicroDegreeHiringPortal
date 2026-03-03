import { useCallback, useEffect, useMemo, useState } from "react";
import { FiUpload } from "react-icons/fi";
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

function YesNoToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
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

function QuestionToggle({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <YesNoToggle value={value} onChange={onChange} />
    </div>
  );
}

export default function ApplyJobModal({
  open,
  onClose,
  job,
  profile,
  onApplied,
}) {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
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
    saveForFuture: false,
  });

  const buildFormFromSources = useCallback(
    ({ previousApplication, resumeRows }) => {
      const safeResumes = Array.isArray(resumeRows) ? resumeRows : [];
      const previousResumeUrl =
        previousApplication?.selected_resume_url ||
        previousApplication?.selectedResumeUrl ||
        "";
      const hasPreviousResume = safeResumes.some(
        (resume) => resume?.file_url === previousResumeUrl,
      );

      return {
        isCurrentlyWorking:
          typeof previousApplication?.is_currently_working === "boolean"
            ? previousApplication.is_currently_working
            : typeof previousApplication?.isCurrentlyWorking === "boolean"
              ? previousApplication.isCurrentlyWorking
              : typeof profile?.isCurrentlyWorking === "boolean"
                ? profile.isCurrentlyWorking
                : null,
        noticePeriod:
          previousApplication?.notice_period ||
          previousApplication?.noticePeriod ||
          "",
        totalExperience:
          previousApplication?.total_experience ||
          previousApplication?.totalExperience ||
          profile?.totalExperience ||
          profile?.experienceYears ||
          "",
        relevantExperience:
          previousApplication?.relevant_experience ||
          previousApplication?.relevantExperience ||
          "",
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
        currentCTC:
          previousApplication?.current_ctc ||
          previousApplication?.currentCTC ||
          profile?.currentCTC ||
          "",
        expectedCTC:
          previousApplication?.expected_ctc ||
          previousApplication?.expectedCTC ||
          profile?.expectedCTC ||
          "",
        selectedResumeUrl: hasPreviousResume ? previousResumeUrl : "",
        jdConfirmed: false,
        saveForFuture: false,
      };
    },
    [profile],
  );

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      const [resumeRows, applicationRows] = await Promise.all([
        listMyResumes(),
        listApplicationsByStudent(),
      ]);

      const safeResumes = Array.isArray(resumeRows) ? resumeRows : [];
      const previousApplication = getMostRecentApplication(
        applicationRows,
        job?.id,
      );

      setResumes(safeResumes);
      setForm(
        buildFormFromSources({
          previousApplication,
          resumeRows: safeResumes,
        }),
      );
    };

    init().catch(() => {
      setResumes([]);
      setForm(
        buildFormFromSources({
          previousApplication: null,
          resumeRows: [],
        }),
      );
    });
  }, [open, job?.id, buildFormFromSources]);

  const selectedSkills = useMemo(() => {
    if (!Array.isArray(job?.skills)) return "";
    return job.skills.join(", ");
  }, [job]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleUploadResumes = async (files) => {
    if (!files?.length) return;

    const remaining = MAX_RESUMES - resumes.length;
    if (remaining <= 0) {
      await showInfo("Maximum 3 resumes are allowed", "Resume Limit Reached");
      return;
    }

    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      await showInfo(
        `Only ${remaining} resume(s) can be uploaded now.`,
        "Resume Limit",
      );
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
      if (form.selectedResumeUrl === resume.file_url) {
        update({ selectedResumeUrl: "" });
      }
    } catch (err) {
      await showError(err?.message || "Failed to delete resume", "Delete Failed");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (typeof form.isCurrentlyWorking !== "boolean") {
      return "Please answer if you are currently working.";
    }
    if (form.isCurrentlyWorking && !String(form.noticePeriod || "").trim()) {
      return "Notice period is required for currently working candidates.";
    }
    if (!String(form.totalExperience || "").trim()) {
      return "Total experience is required.";
    }
    if (!String(form.relevantExperience || "").trim()) {
      return "Relevant experience is required.";
    }
    if (typeof form.handsOnPrimarySkills !== "boolean") {
      return "Please answer hands-on primary skills.";
    }
    if (typeof form.workModeMatch !== "boolean") {
      return "Please answer work mode preference match.";
    }
    if (typeof form.interviewModeAvailable !== "boolean") {
      return "Please answer interview availability.";
    }
    if (!String(form.currentCTC || "").trim()) {
      return "Current CTC is required.";
    }
    if (!String(form.expectedCTC || "").trim()) {
      return "Expected CTC is required.";
    }
    if (!String(form.selectedResumeUrl || "").trim()) {
      return "Please select one resume.";
    }
    if (!form.jdConfirmed) {
      return "You must confirm that you read the Job Description fully.";
    }
    return null;
  };

  const submit = async (event) => {
    event.preventDefault();

    const errorMessage = validate();
    if (errorMessage) {
      await showInfo(errorMessage, "Incomplete Application");
      return;
    }

    setSubmitting(true);
    try {
      await createApplication({
        jobId: job.id,
        isCurrentlyWorking: form.isCurrentlyWorking,
        noticePeriod: form.noticePeriod,
        totalExperience: form.totalExperience,
        relevantExperience: form.relevantExperience,
        handsOnPrimarySkills: form.handsOnPrimarySkills,
        workModeMatch: form.workModeMatch,
        interviewModeAvailable: form.interviewModeAvailable,
        currentCTC: form.currentCTC,
        expectedCTC: form.expectedCTC,
        selectedResumeUrl: form.selectedResumeUrl,
        jdConfirmed: form.jdConfirmed,
        saveForFuture: form.saveForFuture,
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

  return (
    <Modal
      title={`Apply for ${job?.title || "Job"}`}
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-[1000px]"
      scrollable
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="apply-job-form"
            disabled={submitting || uploading}
            className="min-w-40"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      }
    >
      <form id="apply-job-form" onSubmit={submit} className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="font-semibold text-slate-900">Company:</span>{" "}
              {job?.company || "-"}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Work Mode:</span>{" "}
              {job?.work_mode || job?.workMode || "Not specified"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold text-slate-900">JD Skills:</span>{" "}
              {selectedSkills || "Not specified"}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <QuestionToggle
            label="Are you currently working?"
            value={form.isCurrentlyWorking}
            onChange={(value) =>
              update({
                isCurrentlyWorking: value,
                noticePeriod: value ? form.noticePeriod : "",
              })
            }
          />

          {form.isCurrentlyWorking ? (
            <Input
              label="Notice Period"
              value={form.noticePeriod}
              onChange={(event) => update({ noticePeriod: event.target.value })}
              placeholder="e.g. 30 days"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Notice period field appears only for currently working candidates.
            </div>
          )}

          <Input
            label="Total Experience"
            value={form.totalExperience}
            onChange={(event) => update({ totalExperience: event.target.value })}
            placeholder="e.g. 3 years"
          />

          <Input
            label="Relevant Experience"
            value={form.relevantExperience}
            onChange={(event) => update({ relevantExperience: event.target.value })}
            placeholder="e.g. 2 years in React"
          />

          <QuestionToggle
            label="Hands-on primary skills?"
            value={form.handsOnPrimarySkills}
            onChange={(value) => update({ handsOnPrimarySkills: value })}
          />

          <QuestionToggle
            label="Work mode preference match?"
            value={form.workModeMatch}
            onChange={(value) => update({ workModeMatch: value })}
          />

          <QuestionToggle
            label="Interview availability?"
            value={form.interviewModeAvailable}
            onChange={(value) => update({ interviewModeAvailable: value })}
          />

          <div className="hidden md:block" />

          <Input
            label="Current CTC"
            value={form.currentCTC}
            onChange={(event) => update({ currentCTC: event.target.value })}
            placeholder="e.g. 4.5 LPA"
          />

          <Input
            label="Expected CTC"
            value={form.expectedCTC}
            onChange={(event) => update({ expectedCTC: event.target.value })}
            placeholder="e.g. 6.5 LPA"
          />
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Resume Selector
              </div>
              <div className="text-xs text-slate-500">
                Choose one resume (max {MAX_RESUMES}).
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
              <FiUpload className="h-4 w-4" />
              Upload Resume
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(event) =>
                  handleUploadResumes(Array.from(event.target.files || []))
                }
                disabled={uploading || resumes.length >= MAX_RESUMES}
              />
            </label>
          </div>

          <div className="mt-3 space-y-2">
            {resumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No resumes uploaded. Upload at least one resume to apply.
              </div>
            ) : (
              resumes.map((resume) => (
                <label
                  key={resume.id || resume.file_url}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="radio"
                      name="selectedResume"
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
                    <a
                      href={resume.signed_url || resume.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary hover:text-primaryDark"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteResume(resume)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </label>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2">
          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.jdConfirmed}
              onChange={(event) => update({ jdConfirmed: event.target.checked })}
              className="mt-1"
            />
            I have read the Job Description fully.
          </label>

          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.saveForFuture}
              onChange={(event) =>
                update({ saveForFuture: event.target.checked })
              }
              className="mt-1"
            />
            Save details for future applications.
          </label>
        </section>
      </form>
    </Modal>
  );
}
