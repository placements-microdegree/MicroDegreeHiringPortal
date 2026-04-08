import { useEffect, useState } from "react";
import { FiClock, FiVideo, FiCalendar, FiLock } from "react-icons/fi";
import { listDailySessions } from "../../services/dailySessionService";

function SessionCard({ session }) {
  const isEnabled = session?.enabled === true;
  const hasAfterButtonNote = Boolean(String(session?.afterButtonNote || "").trim());

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition ${isEnabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-80"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {session?.topic || "Session"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{session?.days || "-"}</p>
        </div>
        <span
          className={`inline-flex shrink-0 self-start items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-slate-500" />
          <span>Meeting ID: {session?.meetingId || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiLock className="h-4 w-4 text-slate-500" />
          <span>Passcode: {session?.passcode || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiClock className="h-4 w-4 text-slate-500" />
          <span>Time: {session?.time || "-"}</span>
        </div>
      </div>

      <div className="mt-5">
        {isEnabled ? (
          <a
            href={session?.registrationLink || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <FiVideo className="h-4 w-4" />
            Join Zoom Session
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            <FiVideo className="h-4 w-4" />
            Session Disabled Will Be Live Soon
          </button>
        )}

        {hasAfterButtonNote ? (
          <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800">
            {session.afterButtonNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function DailySessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listDailySessions();
        if (active) setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) {
          setSessions([]);
          setError(err?.message || "Failed to load daily sessions");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading daily sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Daily Sessions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Join live sessions directly from here. Disabled sessions are controlled by HR.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </section>
    </div>
  );
}
