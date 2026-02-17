const {
  getSupabaseUser,
  getSupabaseAnon,
  getSupabaseAdmin,
} = require("../config/db");
const { ROLES } = require("../utils/constants");

function getWriteClient(jwt) {
  // Use service role to bypass RLS for server-managed writes.
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

function getReadClient() {
  // Prefer service role for reads to avoid RLS hiding rows; fallback to anon.
  const admin = getSupabaseAdmin();
  return admin || getSupabaseAnon();
}

async function listJobs() {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function createJob({ payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: payload.title,
      company: payload.company,
      description: payload.description,
      skills: payload.skills,
      location: payload.location,
      ctc: payload.ctc,
      posted_by: actor?.id || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateJob({ jobId, payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);

  if (actor?.role === ROLES.ADMIN) {
    const { data: existing, error: loadError } = await supabase
      .from("jobs")
      .select("id, posted_by")
      .eq("id", jobId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (existing && existing.posted_by && existing.posted_by !== actor.id) {
      const err = new Error("You can only edit jobs you posted");
      err.status = 403;
      throw err;
    }
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({
      title: payload.title,
      company: payload.company,
      description: payload.description,
      skills: payload.skills,
      location: payload.location,
      ctc: payload.ctc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deleteJob({ jobId, actor, jwt }) {
  const supabase = getWriteClient(jwt);

  if (actor?.role === ROLES.ADMIN) {
    const { data: existing, error: loadError } = await supabase
      .from("jobs")
      .select("id, posted_by")
      .eq("id", jobId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (existing && existing.posted_by && existing.posted_by !== actor.id) {
      const err = new Error("You can only delete jobs you posted");
      err.status = 403;
      throw err;
    }
  }

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw error;
  return true;
}

module.exports = {
  listJobs,
  createJob,
  updateJob,
  deleteJob,
};
