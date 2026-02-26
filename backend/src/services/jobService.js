const {
  getSupabaseUser,
  getSupabaseAnon,
  getSupabaseAdmin,
} = require("../config/db");
const { ROLES } = require("../utils/constants");

const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const INTERVIEW_MODES = ["Online", "Offline", "Hybrid"];
const JOB_STATUSES = ["active", "closed", "deleted"];

function isSoftDeletedJob(job) {
  return String(job?.status || "").toLowerCase() === "deleted";
}

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

function createBadRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeRequiredText(value, fieldLabel) {
  const normalized = normalizeText(value);
  if (!normalized) throw createBadRequestError(`${fieldLabel} is required`);
  return normalized;
}

function normalizeEnum(value, allowed, fieldLabel) {
  const normalized = normalizeRequiredText(value, fieldLabel);
  const found = allowed.find(
    (item) => item.toLowerCase() === normalized.toLowerCase(),
  );
  if (!found) {
    throw createBadRequestError(
      `${fieldLabel} must be one of: ${allowed.join(", ")}`,
    );
  }
  return found;
}

function normalizeStatus(status) {
  const normalized = normalizeText(status);
  if (!normalized) return null;
  const lowered = normalized.toLowerCase();
  if (!JOB_STATUSES.includes(lowered)) {
    throw createBadRequestError(
      `Status must be one of: ${JOB_STATUSES.join(", ")}`,
    );
  }
  return lowered;
}

function normalizeDateText(value, fieldLabel) {
  const normalized = normalizeRequiredText(value, fieldLabel);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createBadRequestError(`${fieldLabel} must be in YYYY-MM-DD format`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  const isInvalid =
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day;

  if (isInvalid) {
    throw createBadRequestError(`${fieldLabel} must be a valid date`);
  }

  return normalized;
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (skills === null || skills === undefined) return [];

  throw createBadRequestError(
    "Skills must be a comma-separated string or an array",
  );
}

function normalizeJdLink(link) {
  const normalized = normalizeRequiredText(link, "JD link");
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw createBadRequestError("JD link must be a valid URL");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes("drive.google.com") && !host.includes("docs.google.com")) {
    throw createBadRequestError(
      "JD link must be a Google Drive/Docs sharing URL",
    );
  }

  return normalized;
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key);
}

function buildJobWritePayload(payload = {}, { isUpdate = false } = {}) {
  const record = {};

  if (!isUpdate || hasOwn(payload, "title")) {
    record.title = normalizeRequiredText(payload.title, "Title");
  }
  if (!isUpdate || hasOwn(payload, "company")) {
    record.company = normalizeRequiredText(payload.company, "Company");
  }
  if (!isUpdate || hasOwn(payload, "description")) {
    record.description = normalizeRequiredText(payload.description, "Description");
  }
  if (!isUpdate || hasOwn(payload, "jd_link")) {
    record.jd_link = normalizeJdLink(payload.jd_link);
  }
  if (!isUpdate || hasOwn(payload, "skills")) {
    const normalizedSkills = normalizeSkills(payload.skills);
    if (normalizedSkills.length === 0) {
      throw createBadRequestError("At least one skill is required");
    }
    record.skills = normalizedSkills;
  }
  if (!isUpdate || hasOwn(payload, "experience")) {
    record.experience = normalizeRequiredText(payload.experience, "Experience");
  }
  if (!isUpdate || hasOwn(payload, "work_mode")) {
    record.work_mode = normalizeEnum(payload.work_mode, WORK_MODES, "Work mode");
  }
  if (!isUpdate || hasOwn(payload, "notice_period")) {
    record.notice_period = normalizeRequiredText(
      payload.notice_period,
      "Notice period",
    );
  }
  if (!isUpdate || hasOwn(payload, "interview_mode")) {
    record.interview_mode = normalizeEnum(
      payload.interview_mode,
      INTERVIEW_MODES,
      "Interview mode",
    );
  }
  if (!isUpdate || hasOwn(payload, "location")) {
    record.location = normalizeRequiredText(payload.location, "Location");
  }
  if (!isUpdate || hasOwn(payload, "ctc")) {
    record.ctc = normalizeRequiredText(payload.ctc, "CTC");
  }
  if (!isUpdate || hasOwn(payload, "valid_till")) {
    record.valid_till = normalizeDateText(payload.valid_till, "Valid till");
  }
  if (!isUpdate || hasOwn(payload, "status")) {
    const normalizedStatus = normalizeStatus(payload.status);
    if (normalizedStatus) record.status = normalizedStatus;
    if (!isUpdate && !normalizedStatus) record.status = "active";
  }

  return record;
}

async function listJobs({ actor } = {}) {
  const supabase = getReadClient();
  let query = supabase.from("jobs").select("*");

  if (actor?.role === ROLES.ADMIN) {
    query = query.eq("posted_by", actor.id);
  } else if (actor?.role !== ROLES.SUPER_ADMIN) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.eq("status", "active").gte("valid_till", today);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createJob({ payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const record = buildJobWritePayload(payload, { isUpdate: false });
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...record,
      posted_by: actor?.id || null,
      status: record.status || "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateJob({ jobId, payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const updatePayload = buildJobWritePayload(payload, { isUpdate: true });

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
      ...updatePayload,
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
  const { data: existing, error: loadError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) return true;

  if (actor?.role === ROLES.ADMIN) {
    if (existing && existing.posted_by && existing.posted_by !== actor.id) {
      const err = new Error("You can only delete jobs you posted");
      err.status = 403;
      throw err;
    }
  }

  if (isSoftDeletedJob(existing)) return true;

  // Soft-delete so existing applications keep their job relation/history.
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
  return true;
}

module.exports = {
  listJobs,
  createJob,
  updateJob,
  deleteJob,
};
