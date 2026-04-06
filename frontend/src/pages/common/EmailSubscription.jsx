import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiMail, FiRefreshCw, FiXCircle } from "react-icons/fi";
import {
  getEmailSubscriptionByToken,
  updateEmailSubscriptionByToken,
} from "../../services/authService";

export default function EmailSubscription() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || ""), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    async function loadSubscription() {
      if (!token) {
        setError("Invalid subscription link. Please use the latest email link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await getEmailSubscriptionByToken(token);
        setSubscription(data || null);
      } catch (err) {
        setError(err?.message || "Subscription link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();
  }, [token]);

  const onUpdate = async (emailSubscribe) => {
    if (!token) return;

    setSaving(true);
    setError("");
    try {
      const data = await updateEmailSubscriptionByToken({
        token,
        emailSubscribe,
      });
      setSubscription(data || null);
    } catch (err) {
      setError(err?.message || "Failed to update subscription preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <FiMail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Premium Job Email Preferences</h1>
            <p className="text-sm text-slate-600">Manage your MicroDegree premium job alert subscription.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Checking your subscription status...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && subscription ? (
          <div className="space-y-4">
            {subscription.emailSubscribe ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">You are currently subscribed.</p>
                    <p className="mt-1">
                      You are receiving premium job updates at <strong>{subscription.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">You have successfully unsubscribed.</p>
                    <p className="mt-1">
                      As per your request, <strong>{subscription.email}</strong> has been removed from our premium job mailing list.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!subscription.emailSubscribe ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                There has been a mistake? You can re-subscribe now.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {subscription.emailSubscribe ? (
                <button
                  type="button"
                  onClick={() => onUpdate(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiXCircle className="h-4 w-4" />
                  {saving ? "Updating..." : "Yes, Unsubscribe"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate(true)}
                  disabled={saving || subscription.isEligible !== true}
                  title={
                    subscription.isEligible === true
                      ? "Resume receiving premium job emails"
                      : "Only eligible students can subscribe to premium job emails."
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  {saving ? "Updating..." : "Re-subscribe"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
