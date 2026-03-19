const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");

function getWriteClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

function getReadClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

/**
 * Insert a single broadcast notification (user_id = NULL).
 * Visible to all students — no per-user rows needed.
 */
async function createBroadcastNotification({ title, message, type, jwt }) {
  const normalizedTitle = String(title || "").trim();
  const normalizedMessage = String(message || "").trim();
  if (!normalizedTitle || !normalizedMessage) return null;

  const supabase = getWriteClient(jwt);

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: null,
      title: normalizedTitle,
      message: normalizedMessage,
      type: type || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * List notifications for a student:
 *  • Broadcast notifications (user_id IS NULL) that the user hasn't read
 *  • Personal notifications (user_id = userId, kept for backward compat)
 */
async function listNotificationsByUser({ userId, jwt, limit = 50 }) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const supabase = getReadClient(jwt);

  // 1. Get IDs of broadcasts this user already read
  const { data: readRows, error: readError } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", userId);
  if (readError) throw readError;

  const readIds = (readRows || []).map((r) => r.notification_id);

  // 2. Fetch broadcast notifications (user_id is null)
  let broadcastQuery = supabase
    .from("notifications")
    .select("*")
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (readIds.length > 0) {
    broadcastQuery = broadcastQuery.not("id", "in", `(${readIds.join(",")})`);
  }

  const { data: broadcasts, error: bErr } = await broadcastQuery;
  if (bErr) throw bErr;

  // Mark all broadcast items as unread for the UI
  const broadcastItems = (broadcasts || []).map((n) => ({
    ...n,
    is_read: false,
  }));

  // 3. Fetch personal/legacy notifications for this user
  const { data: personal, error: pErr } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (pErr) throw pErr;

  // 4. Merge, sort by created_at desc, clip to limit
  const merged = [...broadcastItems, ...(personal || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, safeLimit);

  const jobTitleRegex = /"([^"]+)"/;
  const jobTitles = [
    ...new Set(
      merged
        .filter(
          (item) => String(item?.type || "").toLowerCase() === "job_posted",
        )
        .map((item) => {
          const message = String(item?.message || "");
          const match = jobTitleRegex.exec(message);
          return String(match?.[1] || "").trim();
        })
        .filter(Boolean),
    ),
  ];

  let jobByTitle = new Map();
  if (jobTitles.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("title, company, experience, created_at")
      .in("title", jobTitles)
      .order("created_at", { ascending: false });

    if (jobsError) throw jobsError;

    jobByTitle = new Map(
      (jobs || []).map((job) => [String(job.title || "").trim(), job]),
    );
  }

  return merged.map((item) => {
    if (String(item?.type || "").toLowerCase() !== "job_posted") {
      return item;
    }

    const message = String(item?.message || "");
    const match = jobTitleRegex.exec(message);
    const inferredRole = String(match?.[1] || "").trim() || null;
    const job = inferredRole ? jobByTitle.get(inferredRole) : null;

    return {
      ...item,
      job_role: inferredRole || null,
      job_company: job?.company || null,
      job_experience: job?.experience || null,
    };
  });
}

/**
 * Mark a notification as read.
 * - Broadcast (user_id is null): insert into notification_reads
 * - Personal (user_id = userId): update the row directly
 */
async function markNotificationAsRead({ notificationId, userId, jwt }) {
  const supabase = getWriteClient(jwt);

  // Check if the notification exists
  const { data: notification, error: fetchErr } = await supabase
    .from("notifications")
    .select("id, user_id")
    .eq("id", notificationId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!notification) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }

  // Broadcast notification — track read in notification_reads
  if (notification.user_id === null) {
    const { error } = await supabase
      .from("notification_reads")
      .upsert(
        { notification_id: notificationId, user_id: userId },
        { onConflict: "notification_id,user_id" },
      );
    if (error) throw error;
    return { ...notification, is_read: true };
  }

  // Personal notification — update in place
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }

  return data;
}

async function markAllNotificationsAsRead({ userId, jwt }) {
  const supabase = getWriteClient(jwt);

  const { data: broadcastRows, error: broadcastError } = await supabase
    .from("notifications")
    .select("id")
    .is("user_id", null);
  if (broadcastError) throw broadcastError;

  const broadcastIds = (broadcastRows || [])
    .map((row) => row.id)
    .filter(Boolean);
  if (broadcastIds.length > 0) {
    const readRows = broadcastIds.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userId,
    }));

    const { error: readInsertError } = await supabase
      .from("notification_reads")
      .upsert(readRows, {
        onConflict: "notification_id,user_id",
        ignoreDuplicates: true,
      });
    if (readInsertError) throw readInsertError;
  }

  const { error: personalUpdateError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (personalUpdateError) throw personalUpdateError;

  return { success: true };
}

module.exports = {
  createBroadcastNotification,
  listNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
