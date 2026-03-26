const { getSupabaseAdmin } = require("../config/db");

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function trackDailyUserActivity({ userId, role, path, method } = {}) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const nowIso = new Date().toISOString();
  const activityDate = getTodayDateKey();

  const { error } = await supabase.from("user_daily_activity").upsert(
    {
      user_id: normalizedUserId,
      role: String(role || "").trim() || null,
      activity_date: activityDate,
      path: String(path || "").trim() || null,
      method: String(method || "").trim() || null,
      first_activity_at: nowIso,
      last_activity_at: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "user_id,activity_date",
    },
  );

  // If migration has not been applied yet, fail silently so auth flow never breaks.
  if (error && error.code !== "42P01") {
    throw error;
  }
}

module.exports = {
  trackDailyUserActivity,
};
