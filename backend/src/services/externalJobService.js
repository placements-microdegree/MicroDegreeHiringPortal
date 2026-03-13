// FILE: services/externalJobService.js

const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

const EXTERNAL_JOB_RETENTION_DAYS = 7;

function getClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

async function pruneExpiredExternalJobs({ jwt }) {
  const supabase = getClient(jwt);
  const cutoff = new Date(
    Date.now() - EXTERNAL_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("external_jobs")
    .delete()
    .lt("created_at", cutoff);

  if (error) throw error;
}

// List all active external jobs (for eligible students)
async function listActiveExternalJobs({ jwt }) {
  await pruneExpiredExternalJobs({ jwt });
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
  await pruneExpiredExternalJobs({ jwt });
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
    company: payload.company,
    job_role: payload.jobRole,
    experience: payload.experience || null,
    ctc: payload.ctc || null,
    location: payload.location || null,
    apply_link: payload.applyLink,
    description: payload.description || null,
    posted_by: userId,
    status: "active",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("external_jobs")
    .insert(toSave)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Bulk create external jobs
async function bulkCreateExternalJobs({ jwt, userId, jobs }) {
  const supabase = getClient(jwt);
  const rows = Array.isArray(jobs) ? jobs : [];
  if (!rows.length) {
    const err = new Error("No jobs provided for bulk upload");
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const toInsert = rows.map((job, idx) => {
    const company = String(job?.company || "").trim();
    const jobRole = String(job?.jobRole || "").trim();
    const applyLink = String(job?.applyLink || "").trim();

    if (!company || !jobRole || !applyLink) {
      const err = new Error(
        `Row ${idx + 1}: company, jobRole and applyLink are required`,
      );
      err.status = 400;
      throw err;
    }

    return {
      company,
      job_role: jobRole,
      experience: String(job?.experience || "").trim() || null,
      ctc: String(job?.ctc || "").trim() || null,
      location: String(job?.location || "").trim() || null,
      apply_link: applyLink,
      description: String(job?.description || "").trim() || null,
      posted_by: userId,
      status: "active",
      updated_at: now,
    };
  });

  const { data, error } = await supabase
    .from("external_jobs")
    .insert(toInsert)
    .select("*");
  if (error) throw error;
  return data || [];
}

// Update an existing external job
async function updateExternalJob({ jwt, jobId, payload }) {
  const supabase = getClient(jwt);
  const toSave = {
    company: payload.company,
    job_role: payload.jobRole,
    experience: payload.experience || null,
    ctc: payload.ctc || null,
    location: payload.location || null,
    apply_link: payload.applyLink,
    description: payload.description || null,
    status: payload.status || "active",
    updated_at: new Date().toISOString(),
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
  bulkCreateExternalJobs,
  updateExternalJob,
  deleteExternalJob,
};
