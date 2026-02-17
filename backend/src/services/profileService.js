const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");

function getClient(jwt) {
  // Prefer service role to bypass RLS recursion issues; fallback to user-scoped client.
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
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
  const toSave = {
    id: userId,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
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

module.exports = {
  getProfileByUserId,
  upsertProfile,
};
