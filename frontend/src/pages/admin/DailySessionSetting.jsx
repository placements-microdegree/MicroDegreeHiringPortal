import { useEffect, useState } from "react";
import {
  createDailySession,
  listDailySessions,
  updateDailySession,
  updateDailySessionStatus,
} from "../../services/dailySessionService";
import { showError, showSuccess } from "../../utils/alerts";

const EMPTY_FORM = {
  title: "",
  days: "",
  meetingId: "",
  passcode: "",
  time: "",
  enabled: true,
};

const DAY_SUGGESTIONS = [
  "Daily",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Monday, Wednesday, Friday",
  "Tuesday, Thursday",
  "Saturday, Sunday",
];

function toFormState(session) {
  return {
    title: String(session?.title || session?.topic || ""),
    days: String(session?.days || ""),
    meetingId: String(session?.meetingId || ""),
    passcode: String(session?.passcode || ""),
    time: String(session?.time || ""),
    enabled: session?.enabled === true,
  };
}

export default function DailySessionSetting() {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await listDailySessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessions([]);
      await showError(err?.message || "Failed to load daily sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertSessionInState = (session) => {
    if (!session?.id) return;

    setSessions((prev) =>
      prev.some((item) => item.id === session.id)
        ? prev.map((item) => (item.id === session.id ? session : item))
        : [session, ...prev],
    );
  };

  const onFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const editSession = (session) => {
    setActiveSessionId(String(session?.id || ""));
    setForm(toFormState(session));
  };

  const resetForm = () => {
    setActiveSessionId("");
    setForm(EMPTY_FORM);
  };

  const submitSession = async (event) => {
    event.preventDefault();

    const payload = {
      title: String(form.title || "").trim(),
      days: String(form.days || "").trim(),
      meetingId: String(form.meetingId || "").trim(),
      passcode: String(form.passcode || "").trim(),
      time: String(form.time || "").trim(),
      enabled: form.enabled === true,
    };

    if (
      !payload.title ||
      !payload.days ||
      !payload.meetingId ||
      !payload.time
    ) {
      await showError("Title, Days, Meeting ID and Time are required");
      return;
    }

    try {
      setSubmitting(true);

      if (activeSessionId) {
        const updated = await updateDailySession(activeSessionId, payload);
        if (updated) {
          upsertSessionInState(updated);
          setForm(toFormState(updated));
        }
        await showSuccess("Session updated successfully");
      } else {
        const created = await createDailySession(payload);
        if (created) {
          upsertSessionInState(created);
          setActiveSessionId(String(created.id || ""));
          setForm(toFormState(created));
        }
        await showSuccess("Session posted successfully");
      }
    } catch (err) {
      await showError(err?.message || "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSessionStatus = async (session) => {
    const id = String(session?.id || "");
    if (!id) return;

    const nextEnabled = session?.enabled !== true;

    try {
      setStatusChangingId(id);
      const updated = await updateDailySessionStatus(id, nextEnabled);
      if (updated) {
        upsertSessionInState(updated);
        if (id === activeSessionId) {
          setForm(toFormState(updated));
        }
      }

      await showSuccess(
        nextEnabled ? "Session activated" : "Session deactivated",
      );
    } catch (err) {
      await showError(err?.message || "Failed to update session status");
    } finally {
      setStatusChangingId("");
    }
  };

  const isEditing = Boolean(activeSessionId);

  let submitButtonLabel = "Create Session";
  if (submitting) {
    submitButtonLabel = "Saving...";
  } else if (isEditing) {
    submitButtonLabel = "Update Session";
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    const aEnabled = a?.enabled === true;
    const bEnabled = b?.enabled === true;
    if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;

    const aTitle = String(a?.title || a?.topic || "").toLowerCase();
    const bTitle = String(b?.title || b?.topic || "").toLowerCase();
    if (aTitle < bTitle) return -1;
    if (aTitle > bTitle) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading daily session settings...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Daily Session Setting
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create sessions once, then manage all edits and active status from
              one place.
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 md:max-w-xs">
            <p className="font-semibold">Quick Flow</p>
            <p className="mt-1">1) Fill details 2) Save 3) Activate session</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEditing ? "Edit Session" : "Create New Session"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Required: Title, Days, Time, Meeting ID
        </p>

        <form className="mt-4 space-y-4" onSubmit={submitSession}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                name="title"
                value={form.title}
                onChange={onFieldChange}
                placeholder="Daily Tech Quiz Series"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Days</span>
              <input
                list="daily-session-day-suggestions"
                name="days"
                value={form.days}
                onChange={onFieldChange}
                placeholder="Sunday or Wednesday, Thursday"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <datalist id="daily-session-day-suggestions">
                {DAY_SUGGESTIONS.map((dayOption) => (
                  <option key={dayOption} value={dayOption} />
                ))}
              </datalist>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Time</span>
              <input
                name="time"
                value={form.time}
                onChange={onFieldChange}
                placeholder="7:00 PM to 8:00 PM"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Meeting ID
              </span>
              <input
                name="meetingId"
                value={form.meetingId}
                onChange={onFieldChange}
                placeholder="83659245933"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Passcode (optional)
              </span>
              <input
                name="passcode"
                value={form.passcode}
                onChange={onFieldChange}
                placeholder="249030"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                name="enabled"
                checked={form.enabled === true}
                onChange={onFieldChange}
                className="h-4 w-4 accent-primary"
              />
              <span>Keep this session active for students</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitButtonLabel}
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Posted Sessions
          </h2>
          <p className="text-xs text-slate-500">Active sessions appear first</p>
        </div>

        {sessions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No sessions posted yet. Use the form above to add the first session.
          </p>
        ) : null}

        {sortedSessions.map((session) => {
          const isUpdatingStatus = statusChangingId === session.id;
          const isCurrentEditing = activeSessionId === session.id;

          let statusButtonLabel = "Activate";
          if (isUpdatingStatus) {
            statusButtonLabel = "Updating...";
          } else if (session.enabled === true) {
            statusButtonLabel = "Deactivate";
          }

          const statusPillClass =
            session.enabled === true
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-700";

          const containerClass = isCurrentEditing
            ? "flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"
            : "flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3";

          return (
            <div key={session.id} className={containerClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {session.title || session.topic}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {session.days}
                  </p>
                  <p className="text-sm text-slate-600">{session.time}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Meeting ID: {session.meetingId || "-"} | Passcode:{" "}
                    {session.passcode || "-"}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass}`}
                >
                  {session.enabled === true ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => editSession(session)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {isCurrentEditing ? "Editing" : "Edit"}
                </button>

                <button
                  type="button"
                  onClick={() => toggleSessionStatus(session)}
                  disabled={isUpdatingStatus}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {statusButtonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
