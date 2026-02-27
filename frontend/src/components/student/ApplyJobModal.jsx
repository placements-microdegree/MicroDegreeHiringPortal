import { useCallback, useEffect, useMemo, useState } from "react";
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

function YesNoButtons({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === true ? "primary" : "outline"}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        variant={value === false ? "primary" : "outline"}
        onClick={() => onChange(false)}
      >
        No
      </Button>
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
        buildFormFromSources({ previousApplication: null, resumeRows: [] }),
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
      await showError(
        err?.message || "Failed to upload resume",
        "Upload Failed",
      );
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
      await showError(
        err?.message || "Failed to delete resume",
        "Delete Failed",
      );
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (typeof form.isCurrentlyWorking !== "boolean") {
      return "Please answer if you are currently working";
    }
    if (form.isCurrentlyWorking && !String(form.noticePeriod || "").trim()) {
      return "Notice period is required for currently working candidates";
    }
    if (!String(form.totalExperience || "").trim()) {
      return "Total experience is required";
    }
    if (!String(form.relevantExperience || "").trim()) {
      return "Relevant experience is required";
    }
    if (typeof form.handsOnPrimarySkills !== "boolean") {
      return "Please answer hands-on primary skills";
    }
    if (typeof form.workModeMatch !== "boolean") {
      return "Please answer work mode preference";
    }
    if (typeof form.interviewModeAvailable !== "boolean") {
      return "Please answer interview mode availability";
    }
    if (!String(form.currentCTC || "").trim()) {
      return "Current CTC is required";
    }
    if (!String(form.expectedCTC || "").trim()) {
      return "Expected CTC is required";
    }
    if (!String(form.selectedResumeUrl || "").trim()) {
      return "Please select one resume";
    }
    if (!form.jdConfirmed) {
      return "You must confirm that you read the JD fully";
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
      maxWidthClass="max-w-[1100px]"
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
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      }
    >
      <form
        id="apply-job-form"
        onSubmit={submit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div>
            <span className="font-semibold">Company:</span>{" "}
            {job?.company || "-"}
          </div>
          <div>
            <span className="font-semibold">JD Skills:</span>{" "}
            {selectedSkills || "Not specified"}
          </div>
          <div>
            <span className="font-semibold">Work Mode:</span>{" "}
            {job?.work_mode || "Not specified"}
          </div>
          <div>
            <span className="font-semibold">Interview Mode:</span>{" "}
            {job?.interview_mode || "Not specified"}
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">
            Are you currently working?
          </div>
          <YesNoButtons
            value={form.isCurrentlyWorking}
            onChange={(value) => update({ isCurrentlyWorking: value })}
          />
        </div>

        <Input
          label="Notice period"
          value={form.noticePeriod}
          onChange={(e) => update({ noticePeriod: e.target.value })}
          disabled={!form.isCurrentlyWorking}
          placeholder={
            form.isCurrentlyWorking ? "e.g. 30 days" : "Not required"
          }
        />

        <Input
          label="Total experience"
          value={form.totalExperience}
          onChange={(e) => update({ totalExperience: e.target.value })}
          placeholder="e.g. 3 years"
        />

        <Input
          label="Relevant experience in JD skills"
          value={form.relevantExperience}
          onChange={(e) => update({ relevantExperience: e.target.value })}
          placeholder="e.g. 2 years in DevOps"
        />

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">
            Hands-on primary skills?
          </div>
          <YesNoButtons
            value={form.handsOnPrimarySkills}
            onChange={(value) => update({ handsOnPrimarySkills: value })}
          />
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">
            Work mode preference matches JD?
          </div>
          <YesNoButtons
            value={form.workModeMatch}
            onChange={(value) => update({ workModeMatch: value })}
          />
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Available for interview mode mentioned in JD?
          </div>
          <YesNoButtons
            value={form.interviewModeAvailable}
            onChange={(value) => update({ interviewModeAvailable: value })}
          />
        </div>

        <Input
          label="Current CTC"
          value={form.currentCTC}
          onChange={(e) => update({ currentCTC: e.target.value })}
        />

        <Input
          label="Expected CTC"
          value={form.expectedCTC}
          onChange={(e) => update({ expectedCTC: e.target.value })}
        />

        <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              Select Resume (Max 3)
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary">
              Upload Resume
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) =>
                  handleUploadResumes(Array.from(e.target.files || []))
                }
                disabled={uploading || resumes.length >= MAX_RESUMES}
              />
            </label>
          </div>

          <div className="mt-3 space-y-2">
            {resumes.length === 0 ? (
              <div className="text-xs text-slate-600">
                No resumes uploaded yet. Upload at least one resume to apply.
              </div>
            ) : (
              resumes.map((resume) => (
                <label
                  key={resume.id || resume.file_url}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selectedResume"
                      checked={form.selectedResumeUrl === resume.file_url}
                      onChange={() =>
                        update({ selectedResumeUrl: resume.file_url })
                      }
                    />
                    <span className="text-sm text-slate-800">
                      {resume.file_name || "Resume"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={resume.signed_url || resume.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteResume(resume)}
                    >
                      Delete
                    </button>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <label className="md:col-span-2 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.jdConfirmed}
            onChange={(e) => update({ jdConfirmed: e.target.checked })}
            className="mt-1"
          />
          I have read the Job Description fully.
        </label>

        <label className="md:col-span-2 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.saveForFuture}
            onChange={(e) => update({ saveForFuture: e.target.checked })}
            className="mt-1"
          />
          Save these details for future applications.
        </label>
      </form>
    </Modal>
  );
}
