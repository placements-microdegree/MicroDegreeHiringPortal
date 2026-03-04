const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");

const BULK_INSERT_CHUNK = 500;

function getWriteClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

function getReadClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

function splitIntoChunks(items, size) {
  const safeItems = Array.isArray(items) ? items : [];
  const chunkSize = Math.max(1, Number(size) || 1);
  const chunks = [];

  for (let index = 0; index < safeItems.length; index += chunkSize) {
    chunks.push(safeItems.slice(index, index + chunkSize));
  }

  return chunks;
}

async function createNotificationsForStudents({ title, message, type, jwt }) {
  const normalizedTitle = String(title || "").trim();
  const normalizedMessage = String(message || "").trim();

  if (!normalizedTitle || !normalizedMessage) return { insertedCount: 0 };

  const supabase = getWriteClient(jwt);

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", ROLES.STUDENT);
  if (studentsError) throw studentsError;

  if (!Array.isArray(students) || students.length === 0) {
    return { insertedCount: 0 };
  }

  const rows = students
    .map((student) => student?.id)
    .filter(Boolean)
    .map((studentId) => ({
      user_id: studentId,
      title: normalizedTitle,
      message: normalizedMessage,
      type: type || null,
    }));

  const chunks = splitIntoChunks(rows, BULK_INSERT_CHUNK);
  for (const chunk of chunks) {
    // Bulk insert in chunks to avoid oversized payloads for large student cohorts.
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase.from("notifications").insert(chunk);
    if (error) throw error;
  }

  return { insertedCount: rows.length };
}

async function listNotificationsByUser({ userId, jwt, limit = 50 }) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const supabase = getReadClient(jwt);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw error;

  return data || [];
}

async function markNotificationAsRead({ notificationId, userId, jwt }) {
  const supabase = getWriteClient(jwt);

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const notFoundError = new Error("Notification not found");
    notFoundError.status = 404;
    throw notFoundError;
  }

  return data;
}

module.exports = {
  createNotificationsForStudents,
  listNotificationsByUser,
  markNotificationAsRead,
};
