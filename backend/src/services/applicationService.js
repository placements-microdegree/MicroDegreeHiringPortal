const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");

function getClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

const APPLICATIONS_ADMIN_SELECT = `
  id,
  status,
  created_at,
  updated_at,
  job_id,
  student_id,
  jobs!inner(
    id,
    title,
    company,
    ctc,
    skills,
    location,
    status,
    posted_by
  ),
  profiles:student_id!inner(
    full_name,
    email,
    phone,
    location,
    resumes(*)
  )
`;

function normalizeApplicationForAdminView(row) {
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    job: row.jobs
      ? {
          id: row.jobs.id,
          title: row.jobs.title,
          company: row.jobs.company,
          ctc: row.jobs.ctc,
          skills: row.jobs.skills,
          location: row.jobs.location,
          status: row.jobs.status,
        }
      : null,
    student: row.profiles
      ? {
          id: row.student_id,
          full_name: row.profiles.full_name,
          email: row.profiles.email,
          phone: row.profiles.phone,
          location: row.profiles.location,
          resumes: Array.isArray(row.profiles.resumes) ? row.profiles.resumes : [],
        }
      : null,
  };
}

async function createApplication({ payload, jwt }) {
  const supabase = getClient(jwt);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_eligible, eligible_until")
    .eq("id", payload.studentId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (
    !profile?.is_eligible ||
    (profile?.eligible_until &&
      new Date(profile.eligible_until) < new Date())
  ) {
    const err = new Error("Not eligible to apply");
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      student_id: payload.studentId,
      job_id: payload.jobId,
      status: payload.status || "Applied",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function listApplicationsByStudent({ studentId, jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function listAllApplications({ actor, jwt }) {
  const supabase = getClient(jwt);

  let query = supabase
    .from("applications")
    .select(APPLICATIONS_ADMIN_SELECT)
    .order("created_at", { ascending: false });

  if (actor?.role === ROLES.ADMIN) {
    query = query.eq("jobs.posted_by", actor.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeApplicationForAdminView);
}

async function updateApplicationStatus({ applicationId, status, actor, jwt }) {
  const supabase = getClient(jwt);

  if (actor?.role === ROLES.ADMIN) {
    const { data: appRow, error: loadError } = await supabase
      .from("applications")
      .select("id, job_id, jobs!inner(posted_by)")
      .eq("id", applicationId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (appRow?.jobs?.posted_by && appRow.jobs.posted_by !== actor.id) {
      const err = new Error("You can only update applications for your jobs");
      err.status = 403;
      throw err;
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  createApplication,
  listApplicationsByStudent,
  listAllApplications,
  updateApplicationStatus,
  normalizeApplicationForAdminView,
};
