import { useEffect, useState } from "react";
import {
  listDailySessions,
  updateDailySessionsSettings,
} from "../../services/dailySessionService";
import { showError, showSuccess } from "../../utils/alerts";

export default function DailySessionSetting() {
  const [sessions, setSessions] = useState([]);
  const [savedSnapshot, setSavedSnapshot] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listDailySessions();
        if (active) {
          const safeData = Array.isArray(data) ? data : [];
          setSessions(safeData);
          setSavedSnapshot(JSON.stringify(safeData));
        }
      } catch (err) {
        if (active) {
          setSessions([]);
          await showError(err?.message || "Failed to load daily sessions");
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

  const toggleSession = (id) => {
    setSessions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const updated = await updateDailySessionsSettings(sessions);
      const safeUpdated = Array.isArray(updated) ? updated : [];
      setSessions(safeUpdated);
      setSavedSnapshot(JSON.stringify(safeUpdated));
      await showSuccess("Daily session settings updated");
    } catch (err) {
      await showError(err?.message || "Failed to update daily sessions");
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(sessions) !== savedSnapshot;

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
        <h1 className="text-xl font-semibold text-slate-900">
          Daily Session Setting
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enable or disable any session card for students.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">{session.topic}</p>
              <p className="text-sm text-slate-600">
                {session.days} | {session.time}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={session.enabled === true}
                onChange={() => toggleSession(session.id)}
                className="h-4 w-4 accent-primary"
              />
              Enabled
            </label>
          </div>
        ))}

        <div className="pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || !hasUnsavedChanges}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {hasUnsavedChanges ? (
              <p className="text-sm font-semibold text-rose-700">
                Please click Save Settings after checking or unchecking any session.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
