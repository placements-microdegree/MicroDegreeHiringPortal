import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";

const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "Onsite"];
const INTERVIEW_MODE_OPTIONS = ["Online", "Offline", "Hybrid"];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "deleted", label: "Deleted" },
];

const INITIAL_FORM = {
  title: "",
  company: "",
  jd_link: "",
  skills: "",
  experience: "",
  work_mode: "",
  notice_period: "",
  interview_mode: "",
  valid_till: "",
  status: "active",
  location: "",
  ctc: "",
};

function parseSkills(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isGoogleDriveLikeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host.includes("drive.google.com") || host.includes("docs.google.com");
  } catch {
    return false;
  }
}

function formatDateInput(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeFormValues(initialValues) {
  if (!initialValues) return { ...INITIAL_FORM };

  return {
    title: String(initialValues.title || "").trim(),
    company: String(initialValues.company || "").trim(),
    jd_link: String(initialValues.jd_link || initialValues.jdLink || "").trim(),
    skills: Array.isArray(initialValues.skills)
      ? initialValues.skills.join(", ")
      : String(initialValues.skills || "").trim(),
    experience: String(initialValues.experience || "").trim(),
    work_mode: WORK_MODE_OPTIONS.includes(initialValues.work_mode)
      ? initialValues.work_mode
      : "",
    notice_period: String(
      initialValues.notice_period || initialValues.noticePeriod || "",
    ).trim(),
    interview_mode: INTERVIEW_MODE_OPTIONS.includes(initialValues.interview_mode)
      ? initialValues.interview_mode
      : "",
    valid_till: formatDateInput(initialValues.valid_till || initialValues.validTill),
    status: STATUS_OPTIONS.some((opt) => opt.value === initialValues.status)
      ? initialValues.status
      : "active",
    location: String(initialValues.location || "").trim(),
    ctc: String(initialValues.ctc || "").trim(),
  };
}

function validateForm(form) {
  const errors = {};

  if (!form.title.trim()) errors.title = "Title is required";
  if (!form.company.trim()) errors.company = "Company is required";
  if (!form.jd_link.trim()) {
    errors.jd_link = "JD link is required";
  } else if (!isGoogleDriveLikeUrl(form.jd_link.trim())) {
    errors.jd_link = "Enter a valid Google Drive/Docs URL";
  }

  if (!parseSkills(form.skills).length) {
    errors.skills = "Enter at least one skill";
  }
  if (!form.experience.trim()) errors.experience = "Experience is required";
  if (!WORK_MODE_OPTIONS.includes(form.work_mode)) {
    errors.work_mode = "Select a valid work mode";
  }
  if (!form.notice_period.trim()) {
    errors.notice_period = "Notice period is required";
  }
  if (!INTERVIEW_MODE_OPTIONS.includes(form.interview_mode)) {
    errors.interview_mode = "Select a valid interview mode";
  }
  if (!form.valid_till.trim()) {
    errors.valid_till = "Valid Till date is required";
  }
  if (!STATUS_OPTIONS.some((opt) => opt.value === form.status)) {
    errors.status = "Select a valid status";
  }
  if (!form.location.trim()) errors.location = "Location is required";
  if (!form.ctc.trim()) errors.ctc = "CTC is required";

  return errors;
}

export default function JDForm({
  onSubmit,
  initialValues = null,
  title = "Post Job Description",
  submitLabel = "Post JD",
  savingLabel = "Posting...",
  onCancel,
  resetOnSuccess = true,
}) {
  const normalizedInitial = useMemo(
    () => normalizeFormValues(initialValues),
    [initialValues],
  );
  const [form, setForm] = useState(normalizedInitial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(normalizedInitial);
    setFieldErrors({});
  }, [normalizedInitial]);

  const update = (patch) => {
    const keys = Object.keys(patch);
    setForm((prev) => ({ ...prev, ...patch }));
    if (keys.length === 1) {
      const field = keys[0];
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit?.({
        ...form,
        title: form.title.trim(),
        company: form.company.trim(),
        description: `${form.title.trim()} at ${form.company.trim()}`,
        jd_link: form.jd_link.trim(),
        skills: form.skills.trim(),
        experience: form.experience.trim(),
        notice_period: form.notice_period.trim(),
        valid_till: form.valid_till,
        status: form.status,
        location: form.location.trim(),
        ctc: form.ctc.trim(),
      });

      if (resetOnSuccess) {
        setForm({ ...INITIAL_FORM });
      }
      setFieldErrors({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">{title}</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Job Title"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          error={fieldErrors.title}
          required
        />
        <Input
          label="Company Name"
          value={form.company}
          onChange={(e) => update({ company: e.target.value })}
          error={fieldErrors.company}
          required
        />

        <Input
          label="JD Link (Google Drive/Docs)"
          type="url"
          placeholder="https://drive.google.com/..."
          value={form.jd_link}
          onChange={(e) => update({ jd_link: e.target.value })}
          error={fieldErrors.jd_link}
          required
        />

        <Input
          label="Experience"
          placeholder="e.g. 2-4 years"
          value={form.experience}
          onChange={(e) => update({ experience: e.target.value })}
          error={fieldErrors.experience}
          required
        />

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Work Mode
          </div>
          <select
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.work_mode ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            value={form.work_mode}
            onChange={(e) => update({ work_mode: e.target.value })}
            required
          >
            <option value="">Select Work Mode</option>
            {WORK_MODE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          {fieldErrors.work_mode ? (
            <div className="mt-1 text-xs text-red-600">
              {fieldErrors.work_mode}
            </div>
          ) : null}
        </label>

        <Input
          label="Notice Period"
          placeholder="e.g. Immediate / 30 days"
          value={form.notice_period}
          onChange={(e) => update({ notice_period: e.target.value })}
          error={fieldErrors.notice_period}
          required
        />

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Interview Mode
          </div>
          <select
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.interview_mode ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            value={form.interview_mode}
            onChange={(e) => update({ interview_mode: e.target.value })}
            required
          >
            <option value="">Select Interview Mode</option>
            {INTERVIEW_MODE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          {fieldErrors.interview_mode ? (
            <div className="mt-1 text-xs text-red-600">
              {fieldErrors.interview_mode}
            </div>
          ) : null}
        </label>

        <Input
          label="Valid Till"
          type="date"
          value={form.valid_till}
          onChange={(e) => update({ valid_till: e.target.value })}
          error={fieldErrors.valid_till}
          required
        />

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Job Status
          </div>
          <select
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.status ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            value={form.status}
            onChange={(e) => update({ status: e.target.value })}
            required
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
          {fieldErrors.status ? (
            <div className="mt-1 text-xs text-red-600">
              {fieldErrors.status}
            </div>
          ) : null}
        </label>

        <label className="col-span-2 block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Skills (comma-separated)
          </div>
          <textarea
            className={`min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.skills ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            placeholder="React, Node.js, SQL"
            value={form.skills}
            onChange={(e) => update({ skills: e.target.value })}
            required
          />
          {fieldErrors.skills ? (
            <div className="mt-1 text-xs text-red-600">{fieldErrors.skills}</div>
          ) : null}
        </label>

        <Input
          label="Location"
          value={form.location}
          onChange={(e) => update({ location: e.target.value })}
          error={fieldErrors.location}
          required
        />
        <Input
          label="CTC"
          value={form.ctc}
          onChange={(e) => update({ ctc: e.target.value })}
          error={fieldErrors.ctc}
          required
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
