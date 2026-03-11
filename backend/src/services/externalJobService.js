// FILE: services/externalJobService.js

const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

function getClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

// List all active external jobs (for eligible students)
async function listActiveExternalJobs({ jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("external_jobs")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// List all external jobs (for HR — all statuses)
async function listAllExternalJobs({ jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("external_jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create a new external job
async function createExternalJob({ jwt, userId, payload }) {
  const supabase = getClient(jwt);
  const toSave = {
    company:     payload.company,
    job_role:    payload.jobRole,
    experience:  payload.experience  || null,
    ctc:         payload.ctc         || null,
    location:    payload.location    || null,
    apply_link:  payload.applyLink,
    description: payload.description || null,
    posted_by:   userId,
    status:      "active",
    updated_at:  new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("external_jobs")
    .insert(toSave)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Update an existing external job
async function updateExternalJob({ jwt, jobId, payload }) {
  const supabase = getClient(jwt);
  const toSave = {
    company:     payload.company,
    job_role:    payload.jobRole,
    experience:  payload.experience  || null,
    ctc:         payload.ctc         || null,
    location:    payload.location    || null,
    apply_link:  payload.applyLink,
    description: payload.description || null,
    status:      payload.status      || "active",
    updated_at:  new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("external_jobs")
    .update(toSave)
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Delete (hard delete) an external job
async function deleteExternalJob({ jwt, jobId }) {
  const supabase = getClient(jwt);
  const { error } = await supabase
    .from("external_jobs")
    .delete()
    .eq("id", jobId);
  if (error) throw error;
}

module.exports = {
  listActiveExternalJobs,
  listAllExternalJobs,
  createExternalJob,
  updateExternalJob,
  deleteExternalJob,
};