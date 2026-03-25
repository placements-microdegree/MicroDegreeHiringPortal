const { getSupabaseAdmin, getSupabaseAnon } = require("../config/db");

function getReadClient() {
  return getSupabaseAdmin() || getSupabaseAnon();
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
  return data;
}
