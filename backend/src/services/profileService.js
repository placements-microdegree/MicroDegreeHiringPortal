const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");
const { normalizePhone } = require("../utils/phone");

function getClient(jwt) {
  // Prefer service role to bypass RLS recursion issues; fallback to user-scoped client.
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

async function getProfileByUserId({ userId, jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertProfile({ userId, jwt, payload }) {
  const supabase = getClient(jwt);
  const normalizedPhone = normalizePhone(payload.phone);

  if (normalizedPhone) {
    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .neq("id", userId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      throw conflict("Mobile number already in use");
    }
  }

  const toSave = {
    id: userId,
    full_name: payload.fullName,
    email: payload.email,
    phone: normalizedPhone || null,
    role: payload.role,
    location: payload.location,
    skills: payload.skills,
    experience_level: payload.experienceLevel,
    experience_years: payload.experienceYears,
    current_ctc: payload.currentCTC,
    expected_ctc: payload.expectedCTC,
    profile_photo_url: payload.profilePhotoUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(toSave)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureProfileRow({ userId, jwt, email, role }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: email || null,
        role: role || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getProfileByUserId,
  upsertProfile,
  ensureProfileRow,
};
