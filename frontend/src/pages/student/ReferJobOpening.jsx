import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiSend } from "react-icons/fi";
import { createStudentReferralStepOne } from "../../services/referralService";
import { showError } from "../../utils/alerts";

const CONNECTION_OPTIONS = [
  { value: "i_work_here", label: "I work here" },
  { value: "friend_works_here", label: "Friend works here" },
  { value: "saw_online", label: "Saw online" },
];

const INITIAL_FORM = {
  companyName: "",
  roleDetails: "",
  location: "",
  connectionType: "",
  comments: "",
  confirmationAcknowledged: true,
};

export default function ReferJobOpening() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      String(form.companyName).trim() &&
      String(form.roleDetails).trim() &&
      String(form.location).trim() &&
      String(form.connectionType).trim() &&
      form.confirmationAcknowledged
    );
  }, [form]);

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      await showError("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const referral = await createStudentReferralStepOne(form);
      navigate(`/student/refer-job-opening/follow-up/${referral.id}`);
    } catch (error) {
      await showError(error?.message || "Unable to share job opening");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-base font-semibold text-slate-900">
          Refer a Job Opening from Your Network
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Share openings from your company, your friends, or trusted online
          sources so our placement team can support eligible candidates.
        </p>
      </section>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Company name
            </span>
            <input
              type="text"
              value={form.companyName}
              onChange={(event) => update({ companyName: event.target.value })}
              placeholder="Example: Infosys, TCS, Microsoft"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Role/Job details
            </span>
            <input
              type="text"
              value={form.roleDetails}
              onChange={(event) => update({ roleDetails: event.target.value })}
              placeholder="Example: DevOps Engineer (2-4 years), Cloud Support Engineer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location
            </span>
            <input
              type="text"
              value={form.location}
              onChange={(event) => update({ location: event.target.value })}
              placeholder="Example: Bengaluru, Hyderabad, Remote"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Your connection
            </span>
            <div className="relative">
              <select
                value={form.connectionType}
                onChange={(event) =>
                  update({ connectionType: event.target.value })
                }
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Choose how you know this opening</option>
                {CONNECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Note/Comments (optional)
            </span>
            <textarea
              value={form.comments}
              onChange={(event) => update({ comments: event.target.value })}
              placeholder="Add useful details: skills required, interview rounds, notice period, urgency"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiSend className="h-4 w-4" />
          {submitting ? "Sharing..." : "Share with placement Team"}
        </button>
      </form>
    </div>
  );
}
