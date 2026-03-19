import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowRightCircle } from "react-icons/fi";
import { submitStudentReferralFollowUp } from "../../services/referralService";
import { showError, showSuccess } from "../../utils/alerts";

const FOLLOW_UP_OPTIONS = [
  {
    value: "direct_referral",
    label: "I can refer a candidate directly",
    description:
      "You can internally refer suitable candidates in your company.",
  },
  {
    value: "share_contact",
    label: "Share HR / Hiring Manager contact",
    description:
      "Provide HR or hiring manager details so our team can connect.",
  },
  {
    value: "team_decide",
    label: "Let placement team decide next step",
    description: "Our team will review and suggest the best approach.",
  },
];

export default function ReferJobOpeningFollowUp() {
  const navigate = useNavigate();
  const { referralId } = useParams();
  const [followUpType, setFollowUpType] = useState("");
  const [followUpContact, setFollowUpContact] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contactRequired = followUpType === "share_contact";
  const canSubmit = useMemo(() => {
    if (!followUpType) return false;
    if (contactRequired && !String(followUpContact).trim()) return false;
    return true;
  }, [followUpType, contactRequired, followUpContact]);

  const submit = async (event) => {
    event.preventDefault();
    if (!referralId) {
      await showError(
        "Missing referral id. Please start from Refer a Job Opening page.",
      );
      navigate("/student/refer-job-opening", { replace: true });
      return;
    }

    if (!canSubmit) {
      await showError("Please complete required details");
      return;
    }

    setSubmitting(true);
    try {
      await submitStudentReferralFollowUp(referralId, {
        followUpType,
        followUpContact,
        followUpNote,
      });
      await showSuccess("Thank you! Shared with placement team successfully.");
      navigate("/student/dashboard", { replace: true });
    } catch (error) {
      await showError(error?.message || "Unable to submit follow-up details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-base font-semibold text-slate-900">
          Great lead! Final step to complete your referral 🎉
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose how you want to help so our placement team can take the right
          action quickly.
        </p>
        <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Step 2 of 2
        </div>
      </section>

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              How can you support this opening?
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select one option below.
            </p>
          </div>

          <div className="grid gap-2">
            {FOLLOW_UP_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFollowUpType(option.value)}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  followUpType === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <div
                  className={`mt-1 text-xs ${
                    followUpType === option.value
                      ? "text-primary/80"
                      : "text-slate-500"
                  }`}
                >
                  {option.description}
                </div>
              </button>
            ))}
          </div>

          {contactRequired ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                HR/Hiring contact details
              </span>
              <input
                type="text"
                value={followUpContact}
                onChange={(event) => setFollowUpContact(event.target.value)}
                placeholder="Example: hr@company.com or https://linkedin.com/in/name or +91XXXXXXXXXX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Share at least one valid contact detail.
              </p>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Note (optional)
            </span>
            <textarea
              value={followUpNote}
              onChange={(event) => setFollowUpNote(event.target.value)}
              placeholder="Anything important to mention: preferred profiles, timing, process details"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Thanks! Our team will review this and reach out within 24 hours.
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiArrowRightCircle className="h-4 w-4" />
          {submitting ? "Submitting details..." : "Submit and Finish"}
        </button>
      </form>
    </div>
  );
}
