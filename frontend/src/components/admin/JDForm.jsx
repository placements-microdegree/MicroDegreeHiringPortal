// FILE: src/components/admin/JDForm.jsx

import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "../common/Button";
import Input from "../common/Input";

const WORK_MODE_OPTIONS      = ["Remote", "Hybrid", "Onsite"];
const INTERVIEW_MODE_OPTIONS = ["Online", "Offline", "Hybrid"];
const STATUS_OPTIONS = [
  { value: "active",  label: "Active"  },
  { value: "closed",  label: "Closed"  },
  { value: "deleted", label: "Deleted" },
];
const MAX_QUESTIONS = 5;

const INITIAL_FORM = {
  title:          "",
  company:        "",
  jd_link:        "",
  skills:         "",
  experience:     "",
  work_mode:      "",
  notice_period:  "",
  interview_mode: [],
  valid_till:     "",   // stored as IST datetime-local string "YYYY-MM-DDTHH:mm"
  status:         "active",
  location:       "",
  ctc:            "",
  questions:      [],
};

// ── helpers ───────────────────────────────────────────────────────────────────

function parseSkills(value) {
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isGoogleDriveLikeUrl(value) {
  try {
    const url  = new URL(value);
    const host = url.hostname.toLowerCase();
    return host.includes("drive.google.com") || host.includes("docs.google.com");
  } catch { return false; }
}

// Convert any date/datetime value → "YYYY-MM-DDTHH:mm" in IST for the input
function toISTDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // IST = UTC + 5:30
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istMs  = date.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  const yyyy = istDate.getUTCFullYear();
  const mm   = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const dd   = String(istDate.getUTCDate()).padStart(2, "0");
  const hh   = String(istDate.getUTCHours()).padStart(2, "0");
  const min  = String(istDate.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// Convert "YYYY-MM-DDTHH:mm" (IST) → ISO UTC string for the backend
function istDatetimeLocalToISO(value) {
  if (!value) return "";
  // value is local IST time — treat as IST and convert to UTC
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const asUTC  = new Date(value);   // JS parses datetime-local as local time
  // We need to explicitly interpret it as IST regardless of browser timezone
  const [datePart, timePart] = value.split("T");
  const [year, month, day]   = datePart.split("-").map(Number);
  const [hour, minute]       = (timePart || "00:00").split(":").map(Number);
  const istMs  = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;
  const utcDate = new Date(istMs);
  return utcDate.toISOString();
}

function normalizeInterviewMode(value) {
  if (Array.isArray(value)) return value.filter((v) => INTERVIEW_MODE_OPTIONS.includes(v));
  if (typeof value === "string" && INTERVIEW_MODE_OPTIONS.includes(value)) return [value];
  return [];
}

function normalizeFormValues(initialValues) {
  if (!initialValues) return { ...INITIAL_FORM };
  return {
    title:         String(initialValues.title        || "").trim(),
    company:       String(initialValues.company      || "").trim(),
    jd_link:       String(initialValues.jd_link || initialValues.jdLink || "").trim(),
    skills: Array.isArray(initialValues.skills)
      ? initialValues.skills.join(", ")
      : String(initialValues.skills || "").trim(),
    experience:    String(initialValues.experience   || "").trim(),
    work_mode: WORK_MODE_OPTIONS.includes(initialValues.work_mode)
      ? initialValues.work_mode : "",
    notice_period: String(initialValues.notice_period || initialValues.noticePeriod || "").trim(),
    interview_mode: normalizeInterviewMode(initialValues.interview_mode),
    valid_till: toISTDatetimeLocal(initialValues.valid_till || initialValues.validTill),
    status: STATUS_OPTIONS.some((o) => o.value === initialValues.status)
      ? initialValues.status : "active",
    location: String(initialValues.location || "").trim(),
    ctc:      String(initialValues.ctc      || "").trim(),
    questions: Array.isArray(initialValues.questions)
      ? initialValues.questions.map((q, i) => ({
          id:          q.id          || crypto.randomUUID(),
          question:    q.question    || "",
          answer_type: q.answer_type || "text",
          order_index: typeof q.order_index === "number" ? q.order_index : i,
        }))
      : [],
  };
}

function validateForm(form) {
  const errors = {};
  if (!form.title.trim())   errors.title   = "Title is required";
  if (!form.company.trim()) errors.company = "Company is required";
  if (!form.jd_link.trim()) {
    errors.jd_link = "JD link is required";
  } else if (!isGoogleDriveLikeUrl(form.jd_link.trim())) {
    errors.jd_link = "Enter a valid Google Drive/Docs URL";
  }
  if (!parseSkills(form.skills).length) errors.skills        = "Enter at least one skill";
  if (!form.experience.trim())          errors.experience    = "Experience is required";
  if (!WORK_MODE_OPTIONS.includes(form.work_mode)) errors.work_mode = "Select a valid work mode";
  if (!form.notice_period.trim())       errors.notice_period = "Notice period is required";
  if (!form.interview_mode.length)      errors.interview_mode = "Select at least one interview mode";
  if (!form.valid_till.trim())          errors.valid_till    = "Valid Till date & time is required";
  if (!STATUS_OPTIONS.some((o) => o.value === form.status)) errors.status = "Select a valid status";
  if (!form.location.trim()) errors.location = "Location is required";
  if (!form.ctc.trim())      errors.ctc      = "CTC is required";
  form.questions.forEach((q, i) => {
    if (!q.question.trim()) errors[`question_${i}`] = "Question text is required";
  });
  return errors;
}

// ── InterviewModeCheckboxes ───────────────────────────────────────────────────

function InterviewModeCheckboxes({ value, onChange, error }) {
  const toggle = (mode) =>
    onChange(value.includes(mode) ? value.filter((m) => m !== mode) : [...value, mode]);

  return (
    <div>
      <div className={`mb-1.5 text-sm font-medium ${error ? "text-red-600" : "text-slate-700"}`}>
        Interview Mode <span className="text-red-500">*</span>
        <span className="ml-1 text-xs font-normal text-slate-400">(select all that apply)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTERVIEW_MODE_OPTIONS.map((mode) => {
          const checked = value.includes(mode);
          return (
            <label
              key={mode}
              className={`flex cursor-pointer select-none items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                checked
                  ? "border-primary bg-primary/10 text-primary"
                  : error
                    ? "border-red-300 bg-red-50 text-slate-700 hover:border-red-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(mode)} />
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
                checked ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
              }`}>
                {checked && "✓"}
              </span>
              {mode}
            </label>
          );
        })}
      </div>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}

// ── CustomQuestionsBuilder ────────────────────────────────────────────────────

function CustomQuestionsBuilder({ questions, onChange, errors }) {
  const add = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    onChange([...questions, { id: crypto.randomUUID(), question: "", answer_type: "text", order_index: questions.length }]);
  };
  const remove = (i) => onChange(questions.filter((_, idx) => idx !== i));
  const updateQ = (i, patch) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  return (
    <div className="col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-700">
            Custom Questions{" "}
            <span className="text-xs font-normal text-slate-400">(optional — max {MAX_QUESTIONS})</span>
          </div>
          <p className="text-xs text-slate-500">Students must answer these when applying.</p>
        </div>
        {questions.length < MAX_QUESTIONS && (
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            <FiPlus className="h-3.5 w-3.5" />
            Add Question
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No custom questions added. Click "Add Question" to add up to {MAX_QUESTIONS}.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Question {i + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  <FiTrash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Do you have experience with microservices?"
                value={q.question}
                onChange={(e) => updateQ(i, { question: e.target.value })}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${
                  errors?.[`question_${i}`]
                    ? "border-red-400 focus:border-red-500"
                    : "border-slate-200 focus:border-primary"
                }`}
              />
              {errors?.[`question_${i}`] && (
                <div className="mt-1 text-xs text-red-600">{errors[`question_${i}`]}</div>
              )}
              <div className="mt-2 flex items-center gap-4">
                <span className="text-xs text-slate-500">Answer type:</span>
                {[{ val: "text", label: "Free text" }, { val: "yesno", label: "Yes / No" }].map(({ val, label }) => (
                  <label key={val} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="radio"
                      name={`answer_type_${q.id}`}
                      value={val}
                      checked={q.answer_type === val}
                      onChange={() => updateQ(i, { answer_type: val })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── JDForm ────────────────────────────────────────────────────────────────────

export default function JDForm({
  onSubmit,
  initialValues = null,
  title         = "Post Job Description",
  submitLabel   = "Post JD",
  savingLabel   = "Posting...",
  onCancel,
  resetOnSuccess = true,
}) {
  const normalizedInitial = useMemo(() => normalizeFormValues(initialValues), [initialValues]);
  const [form,        setForm]        = useState(normalizedInitial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving,      setSaving]      = useState(false);

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
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setSaving(true);
    try {
      await onSubmit?.({
        title:          form.title.trim(),
        company:        form.company.trim(),
        description:    `${form.title.trim()} at ${form.company.trim()}`,
        jd_link:        form.jd_link.trim(),
        skills:         form.skills.trim(),
        experience:     form.experience.trim(),
        work_mode:      form.work_mode,
        notice_period:  form.notice_period.trim(),
        interview_mode: form.interview_mode,
        // Convert IST datetime-local → UTC ISO string for backend
        valid_till:     istDatetimeLocalToISO(form.valid_till),
        status:         form.status,
        location:       form.location.trim(),
        ctc:            form.ctc.trim(),
        questions:      form.questions.map((q, i) => ({
          id:          q.id,
          question:    q.question.trim(),
          answer_type: q.answer_type,
          order_index: i,
        })),
      });

      if (resetOnSuccess) setForm({ ...INITIAL_FORM, interview_mode: [], questions: [] });
      setFieldErrors({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">{title}</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

        <Input label="Job Title" value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          error={fieldErrors.title} required />

        <Input label="Company Name" value={form.company}
          onChange={(e) => update({ company: e.target.value })}
          error={fieldErrors.company} required />

        <Input label="JD Link (Google Drive/Docs)" type="url"
          placeholder="https://drive.google.com/..."
          value={form.jd_link}
          onChange={(e) => update({ jd_link: e.target.value })}
          error={fieldErrors.jd_link} required />

        <Input label="Experience" placeholder="e.g. 2-4 years"
          value={form.experience}
          onChange={(e) => update({ experience: e.target.value })}
          error={fieldErrors.experience} required />

        {/* Work Mode */}
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Work Mode</div>
          <select
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.work_mode ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            value={form.work_mode}
            onChange={(e) => update({ work_mode: e.target.value })}
            required
          >
            <option value="">Select Work Mode</option>
            {WORK_MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {fieldErrors.work_mode && <div className="mt-1 text-xs text-red-600">{fieldErrors.work_mode}</div>}
        </label>

        <Input label="Notice Period" placeholder="e.g. Immediate / 30 days"
          value={form.notice_period}
          onChange={(e) => update({ notice_period: e.target.value })}
          error={fieldErrors.notice_period} required />

        {/* Interview Mode checkboxes */}
        <div className="col-span-2 md:col-span-1">
          <InterviewModeCheckboxes
            value={form.interview_mode}
            onChange={(val) => update({ interview_mode: val })}
            error={fieldErrors.interview_mode}
          />
        </div>

        {/* Valid Till — datetime-local picker (IST) */}
        <label className="block">
          <div className={`mb-1 text-sm font-medium ${fieldErrors.valid_till ? "text-red-600" : "text-slate-700"}`}>
            Valid Till (IST) <span className="text-red-500">*</span>
          </div>
          <input
            type="datetime-local"
            value={form.valid_till}
            onChange={(e) => update({ valid_till: e.target.value })}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${
              fieldErrors.valid_till ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"
            }`}
            required
          />
          <div className="mt-1 text-xs text-slate-400">
            Enter date &amp; time in IST. Job auto-closes after this time.
          </div>
          {fieldErrors.valid_till && (
            <div className="mt-1 text-xs text-red-600">{fieldErrors.valid_till}</div>
          )}
        </label>

        {/* Job Status */}
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Job Status</div>
          <select
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.status ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            value={form.status}
            onChange={(e) => update({ status: e.target.value })}
            required
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {fieldErrors.status && <div className="mt-1 text-xs text-red-600">{fieldErrors.status}</div>}
        </label>

        {/* Skills */}
        <label className="col-span-2 block">
          <div className="mb-1 text-sm font-medium text-slate-700">Skills (comma-separated)</div>
          <textarea
            className={`min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${fieldErrors.skills ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
            placeholder="React, Node.js, SQL"
            value={form.skills}
            onChange={(e) => update({ skills: e.target.value })}
            required
          />
          {fieldErrors.skills && <div className="mt-1 text-xs text-red-600">{fieldErrors.skills}</div>}
        </label>

        <Input label="Location" value={form.location}
          onChange={(e) => update({ location: e.target.value })}
          error={fieldErrors.location} required />

        <Input label="CTC (in LPA)" value={form.ctc}
          onChange={(e) => update({ ctc: e.target.value })}
          error={fieldErrors.ctc} required />

        {/* Custom Questions */}
        <CustomQuestionsBuilder
          questions={form.questions}
          onChange={(qs) => update({ questions: qs })}
          errors={fieldErrors}
        />

      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}