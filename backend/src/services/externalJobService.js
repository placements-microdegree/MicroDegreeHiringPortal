// FILE: services/externalJobService.js

const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

const EXTERNAL_JOB_RETENTION_DAYS = 7;

function parseIsoDayToUtcRange(dateString) {
  if (!dateString) return null;

  const value = String(dateString).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const err = new Error("Invalid date. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  const start = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    const err = new Error("Invalid date. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, date: value };
}

function getClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

function getPublicWriteClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;

  const err = new Error(
    "Public tracking requires SUPABASE_SERVICE_ROLE_KEY configuration",
  );
  err.status = 503;
  throw err;
}

function sanitizeTrackingMeta(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const rawRef = source.ref ? String(source.ref).trim() : "";
  const normalizedRef =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawRef,
    )
      ? rawRef
      : null;

  return {
    ref: normalizedRef,
    utmSource: source.utm_source ? String(source.utm_source).trim() : null,
    utmMedium: source.utm_medium ? String(source.utm_medium).trim() : null,
    utmCampaign: source.utm_campaign
      ? String(source.utm_campaign).trim()
      : null,
    shareChannel: source.share_channel
      ? String(source.share_channel).trim()
      : null,
    visitorToken: source.visitor_token
      ? String(source.visitor_token).trim()
      : null,
    landingPath: source.landing_path
      ? String(source.landing_path).trim()
      : null,
  };
}

function normalizeSkills(rawSkills) {
  const source = Array.isArray(rawSkills)
    ? rawSkills
    : String(rawSkills || "").split(",");

  const unique = [];
  const seen = new Set();

  source.forEach((item) => {
    const value = String(item || "").trim();
    if (!value) return;

    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(value);
  });

  return unique;
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

async function validateExternalJobForClick({ supabase, jobId }) {
  const { data: job, error: readError } = await supabase
    .from("external_jobs")
    .select("id, status, apply_click_count")
    .eq("id", jobId)
    .maybeSingle();

  if (readError) throw readError;
  if (!job) {
    const err = new Error("External job not found");
    err.status = 404;
    throw err;
  }
  if (job.status !== "active") {
    const err = new Error("External job is not active");
    err.status = 400;
    throw err;
  }

  return job;
}

async function updateExternalJobClickCounter({
  supabase,
  jobId,
  currentCount,
}) {
  const now = new Date().toISOString();
  const nextCount = Number(currentCount || 0) + 1;

  const { data, error } = await supabase
    .from("external_jobs")
    .update({
      apply_click_count: nextCount,
      last_clicked_at: now,
      updated_at: now,
    })
    .eq("id", jobId)
    .select("id, apply_click_count, last_clicked_at")
    .single();

  if (error) throw error;
  return data;
}

async function updateExternalJobShareCounter({
  supabase,
  jobId,
  currentCount,
}) {
  const now = new Date().toISOString();
  const nextCount = Number(currentCount || 0) + 1;

  const { data, error } = await supabase
    .from("external_jobs")
    .update({
      share_count: nextCount,
      last_shared_at: now,
      updated_at: now,
    })
    .eq("id", jobId)
    .select("id, share_count, last_shared_at")
    .single();

  if (error) throw error;
  return data;
}

async function insertGrowthEvent({
  supabase,
  eventType,
  jobId = null,
  studentId = null,
  refStudentId = null,
  tracking = {},
  userAgent = null,
  ipAddress = null,
}) {
  const meta = sanitizeTrackingMeta(tracking);

  const { error } = await supabase.from("external_job_growth_events").insert({
    event_type: eventType,
    job_id: jobId,
    student_id: studentId,
    ref_student_id: refStudentId,
    utm_source: meta.utmSource,
    utm_medium: meta.utmMedium,
    utm_campaign: meta.utmCampaign,
    share_channel: meta.shareChannel,
    visitor_token: meta.visitorToken,
    landing_path: meta.landingPath,
    user_agent: userAgent,
    ip_address: ipAddress,
  });

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

// Public listing for share links
async function listPublicActiveExternalJobs() {
  await pruneExpiredExternalJobs({ jwt: null });
  const supabase = getClient(null);
  const { data, error } = await supabase
    .from("external_jobs")
    .select(
      "id, company, job_role, experience, skills, location, apply_link, description, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// List all external jobs (for HR — all statuses)
async function listAllExternalJobs({ jwt, createdDate }) {
  await pruneExpiredExternalJobs({ jwt });
  const supabase = getClient(jwt);

  const range = parseIsoDayToUtcRange(createdDate);
  let query = supabase.from("external_jobs").select("*");
  if (range) {
    query = query
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString());
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw error;

  return data || [];
}

// Create a new external job
async function createExternalJob({ jwt, userId, payload }) {
  const supabase = getClient(jwt);
  const skills = normalizeSkills(payload.skills);
  const toSave = {
    company: payload.company,
    job_role: payload.jobRole,
    experience: payload.experience || null,
    skills: skills.length ? skills : null,
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

    const skills = normalizeSkills(job?.skills);

    return {
      company,
      job_role: jobRole,
      experience: String(job?.experience || "").trim() || null,
      skills: skills.length ? skills : null,
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
  const skills = normalizeSkills(payload.skills);
  const toSave = {
    company: payload.company,
    job_role: payload.jobRole,
    experience: payload.experience || null,
    skills: skills.length ? skills : null,
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

// Track student apply-link click for analytics
async function trackExternalJobClick({ jwt, jobId, studentId, tracking = {} }) {
  const supabase = getClient(jwt);
  const job = await validateExternalJobForClick({ supabase, jobId });
  const meta = sanitizeTrackingMeta(tracking);

  if (studentId) {
    const { error: clickInsertError } = await supabase
      .from("external_job_apply_clicks")
      .insert({
        job_id: jobId,
        student_id: studentId,
        clicked_at: new Date().toISOString(),
      });

    if (clickInsertError) throw clickInsertError;
  }

  const refStudentId = meta.ref;
  await insertGrowthEvent({
    supabase,
    eventType: "apply_click",
    jobId,
    studentId,
    refStudentId,
    tracking,
  });

  return updateExternalJobClickCounter({
    supabase,
    jobId,
    currentCount: job.apply_click_count,
  });
}

async function trackPublicExternalJobClick({
  jobId,
  tracking = {},
  userAgent = null,
  ipAddress = null,
}) {
  const supabase = getPublicWriteClient();
  const job = await validateExternalJobForClick({ supabase, jobId });
  const meta = sanitizeTrackingMeta(tracking);

  const refStudentId = meta.ref;
  await insertGrowthEvent({
    supabase,
    eventType: "apply_click",
    jobId,
    studentId: null,
    refStudentId,
    tracking,
    userAgent,
    ipAddress,
  });

  return updateExternalJobClickCounter({
    supabase,
    jobId,
    currentCount: job.apply_click_count,
  });
}

async function trackExternalJobShare({
  jwt,
  jobId,
  studentId,
  tracking = {},
  userAgent = null,
  ipAddress = null,
}) {
  const supabase = getClient(jwt);

  const { data: job, error: readError } = await supabase
    .from("external_jobs")
    .select("id, status, share_count")
    .eq("id", jobId)
    .maybeSingle();

  if (readError) throw readError;
  if (!job) {
    const err = new Error("External job not found");
    err.status = 404;
    throw err;
  }
  if (job.status !== "active") {
    const err = new Error("External job is not active");
    err.status = 400;
    throw err;
  }

  await insertGrowthEvent({
    supabase,
    eventType: "share",
    jobId,
    studentId,
    refStudentId: studentId,
    tracking,
    userAgent,
    ipAddress,
  });

  const updated = await updateExternalJobShareCounter({
    supabase,
    jobId,
    currentCount: job.share_count,
  });

  return {
    ok: true,
    id: updated.id,
    share_count: Number(updated.share_count || 0),
    last_shared_at: updated.last_shared_at || null,
  };
}

async function trackExternalJobsPublicVisit({
  tracking = {},
  userAgent = null,
  ipAddress = null,
}) {
  const supabase = getPublicWriteClient();
  const meta = sanitizeTrackingMeta(tracking);

  const refStudentId = meta.ref;
  await insertGrowthEvent({
    supabase,
    eventType: "visit",
    jobId: null,
    studentId: null,
    refStudentId,
    tracking,
    userAgent,
    ipAddress,
  });

  return { ok: true };
}

async function trackExternalJobsPageVisit({ jwt, studentId }) {
  const supabase = getClient(jwt);

  const { data, error } = await supabase
    .from("external_jobs_page_visits")
    .insert({
      student_id: studentId,
      visited_at: new Date().toISOString(),
    })
    .select("id, visited_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    visitedAt: data.visited_at,
  };
}

async function getExternalJobsVisitAnalytics({ jwt }) {
  const supabase = getClient(jwt);

  const [
    { count, error: totalError },
    { data: latestRow, error: latestError },
    { data: visitRows, error: rowsError },
  ] = await Promise.all([
    supabase
      .from("external_jobs_page_visits")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("external_jobs_page_visits")
      .select("visited_at")
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("external_jobs_page_visits")
      .select("student_id, visited_at, profiles:student_id(full_name, email)"),
  ]);

  if (totalError) throw totalError;
  if (latestError) throw latestError;
  if (rowsError) throw rowsError;

  const perStudent = new Map();
  (visitRows || []).forEach((row) => {
    const studentId = row.student_id;
    const visitedAt = row.visited_at || null;
    const profile = row.profiles || {};

    if (!studentId) return;

    const existing = perStudent.get(studentId) || {
      studentId,
      fullName: profile.full_name || "Unknown",
      email: profile.email || "-",
      visitCount: 0,
      lastVisitedAt: null,
    };

    existing.visitCount += 1;
    if (
      !existing.lastVisitedAt ||
      new Date(visitedAt).getTime() > new Date(existing.lastVisitedAt).getTime()
    ) {
      existing.lastVisitedAt = visitedAt;
    }

    perStudent.set(studentId, existing);
  });

  const topStudents = Array.from(perStudent.values()).sort((a, b) => {
    if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
    return (
      new Date(b.lastVisitedAt || 0).getTime() -
      new Date(a.lastVisitedAt || 0).getTime()
    );
  });

  return {
    totalVisits: Number(count || 0),
    uniqueStudents: topStudents.length,
    lastVisitedAt: latestRow?.visited_at || null,
    topStudent: topStudents[0] || null,
    topStudents,
  };
}

module.exports = {
  listActiveExternalJobs,
  listPublicActiveExternalJobs,
  listAllExternalJobs,
  createExternalJob,
  bulkCreateExternalJobs,
  updateExternalJob,
  deleteExternalJob,
  trackExternalJobClick,
  trackPublicExternalJobClick,
  trackExternalJobShare,
  trackExternalJobsPageVisit,
  trackExternalJobsPublicVisit,
  getExternalJobsVisitAnalytics,
};
