const { getSupabaseAdmin, getSupabaseAnon } = require("../config/db");

function getReadClient() {
  return getSupabaseAdmin() || getSupabaseAnon();
}

const PROFILE_CLEARED_STATUSES = new Set([
  "Cleared",
  "Cleared AWS Drive",
  "Cleared DevOps Drive",
]);

function normalizeDriveClearedStatusArray(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Set();
  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (normalized) unique.add(normalized);
  });
  return [...unique];
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const byDate = new Map();
  entries.forEach((entry) => {
    const status = String(entry?.status || "").trim();
    const date = String(entry?.date || "").trim();
    if (!status || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    byDate.set(date, { status, date });
  });
  return [...byDate.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

async function getNextDrive({ withInactive = false } = {}) {
  const supabase = getReadClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from("cloud_drives")
    .select("*")
    .gte("drive_date", todayIso)
    .order("drive_date", { ascending: true })
    .limit(1);
  if (!withInactive) {
    q = q.eq("is_active", true);
  }
  const { data, error } = await q;
  if (error) throw error;
  if (data && data.length) return data[0];

  if (!withInactive) {
    const { data: activeData, error: activeError } = await supabase
      .from("cloud_drives")
      .select("*")
      .eq("is_active", true)
      .order("drive_date", { ascending: false })
      .limit(1);
    if (activeError) throw activeError;
    return activeData && activeData.length ? activeData[0] : null;
  }

  return null;
}

async function findRegistration({ profileId, driveId }) {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("cloud_drive_registrations")
    .select("*")
    .match({ profile_id: profileId, drive_id: driveId })
    .limit(1);
  if (error) throw error;
  return data && data.length ? data[0] : null;
}

async function createRegistration(reg) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Admin DB client not configured");
  const { data, error } = await supabase
    .from("cloud_drive_registrations")
    .insert([reg])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function listRegistrations({ driveId, filters = {} } = {}) {
  const supabase = getReadClient();
  let q = supabase.from("cloud_drive_registrations").select("*");
  if (driveId) q = q.eq("drive_id", driveId);
  if (filters.email) q = q.ilike("email", `%${filters.email}%`);
  if (filters.full_name) q = q.ilike("full_name", `%${filters.full_name}%`);
  const { data, error } = await q.order("registered_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listRegistrationsForProfile(profileId) {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("cloud_drive_registrations")
    .select("id, drive_id, status, hr_comment, registered_at, cloud_drives(drive_date)")
    .eq("profile_id", profileId)
    .order("registered_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    drive_date: row.cloud_drives?.drive_date || null,
  }));
}

async function upsertDrive(drive) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Admin DB client not configured");

  const normalizedDrive = {
    ...drive,
    title: drive.title || "Career Assistance",
  };

  if (normalizedDrive.is_active) {
    const { error: deactivateError } = await supabase
      .from("cloud_drives")
      .update({ is_active: false })
      .eq("is_active", true);
    if (deactivateError) throw deactivateError;
  }

  if (normalizedDrive.id) {
    const { data, error } = await supabase
      .from("cloud_drives")
      .update(normalizedDrive)
      .eq("id", normalizedDrive.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("cloud_drives")
    .insert([normalizedDrive])
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getNextDrive,
  findRegistration,
  createRegistration,
  listRegistrations,
  listRegistrationsForProfile,
  upsertDrive,
  listDrives,
  updateRegistration,
};

async function listDrives() {
  const supabase = getReadClient();
  const { data, error } = await supabase.from("cloud_drives").select("*").order("drive_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateRegistration(id, changes) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Admin DB client not configured");
  const { data, error } = await supabase
    .from("cloud_drive_registrations")
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (data?.profile_id && typeof changes?.status === "string") {
    const status = String(changes.status || "").trim();
    const profilePatch = {
      cloud_drive_status: status || null,
      updated_at: new Date().toISOString(),
    };

    if (PROFILE_CLEARED_STATUSES.has(status)) {
      const { data: profileRow, error: profileReadError } = await supabase
        .from("profiles")
        .select("drive_cleared_status, cloud_drive_status_history")
        .eq("id", data.profile_id)
        .maybeSingle();

      if (!profileReadError) {
        const entryDate =
          normalizeDateOnly(changes.driveClearedDate) ||
          normalizeDateOnly(new Date().toISOString());
        const nextHistory = normalizeHistoryEntries([
          ...(profileRow?.cloud_drive_status_history || []),
          { status, date: entryDate },
        ]);
        const latest = nextHistory[0] || null;

        profilePatch.drive_cleared_status = normalizeDriveClearedStatusArray([
          ...(profileRow?.drive_cleared_status || []),
          status,
        ]);

        profilePatch.cloud_drive_status_history = nextHistory;
        profilePatch.cloud_drive_status = latest?.status || status;
        profilePatch.drive_cleared_date = latest?.date || entryDate;
      }
    }

    await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", data.profile_id);
  }

  return data;
}
