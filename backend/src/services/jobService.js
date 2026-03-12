// FILE: services/jobService.js

const {
  getSupabaseUser,
  getSupabaseAnon,
  getSupabaseAdmin,
} = require("../config/db");
const { ROLES } = require("../utils/constants");
const notificationService = require("./notificationService");
const emailService = require("./emailService");

const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const INTERVIEW_MODES = ["Online", "Offline", "Hybrid"];
const JOB_STATUSES = ["active", "closed", "deleted"];
const MAX_QUESTIONS = 5;

function isSoftDeletedJob(job) {
  return String(job?.status || "").toLowerCase() === "deleted";
}
function getWriteClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}
function getReadClient() {
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
  if (!found)
    throw createBadRequestError(
      `${fieldLabel} must be one of: ${allowed.join(", ")}`,
    );
  return found;
}
function normalizeStatus(status) {
  const normalized = normalizeText(status);
  if (!normalized) return null;
  const lowered = normalized.toLowerCase();
  if (!JOB_STATUSES.includes(lowered))
    throw createBadRequestError(
      `Status must be one of: ${JOB_STATUSES.join(", ")}`,
    );
  return lowered;
}

// NEW — accepts full ISO datetime string (UTC) from frontend
function normalizeValidTill(value, fieldLabel) {
  const normalized = normalizeRequiredText(value, fieldLabel);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime()))
    throw createBadRequestError(`${fieldLabel} must be a valid date/time`);
  return parsed.toISOString(); // always store as UTC ISO in DB
}

function normalizeSkills(skills) {
  if (Array.isArray(skills))
    return skills.map((item) => normalizeText(item)).filter(Boolean);
  if (typeof skills === "string")
    return skills
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
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
  if (!host.includes("drive.google.com") && !host.includes("docs.google.com"))
    throw createBadRequestError(
      "JD link must be a Google Drive/Docs sharing URL",
    );
  return normalized;
}
function normalizeInterviewModes(value) {
  let modes;
  if (Array.isArray(value)) {
    modes = value;
  } else if (typeof value === "string" && value.trim()) {
    modes = [value.trim()];
  } else {
    throw createBadRequestError("Interview mode is required");
  }
  if (modes.length === 0)
    throw createBadRequestError("Select at least one interview mode");
  return modes.map((m) => {
    const found = INTERVIEW_MODES.find(
      (im) => im.toLowerCase() === String(m).trim().toLowerCase(),
    );
    if (!found)
      throw createBadRequestError(
        `Invalid interview mode "${m}". Must be one of: ${INTERVIEW_MODES.join(", ")}`,
      );
    return found;
  });
}
function normalizeQuestions(questions) {
  if (!questions) return [];
  if (!Array.isArray(questions))
    throw createBadRequestError("Questions must be an array");
  if (questions.length > MAX_QUESTIONS)
    throw createBadRequestError(
      `Maximum ${MAX_QUESTIONS} custom questions allowed`,
    );
  return questions.map((q, i) => {
    const question = normalizeText(q?.question);
    if (!question)
      throw createBadRequestError(`Question ${i + 1} text is required`);
    const answerType = q?.answer_type || "text";
    if (!["text", "yesno"].includes(answerType))
      throw createBadRequestError(
        `Question ${i + 1} answer_type must be 'text' or 'yesno'`,
      );
    return {
      question,
      answer_type: answerType,
      order_index: typeof q?.order_index === "number" ? q.order_index : i,
    };
  });
}
function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key);
}

function buildJobWritePayload(payload = {}, { isUpdate = false } = {}) {
  const record = {};
  if (!isUpdate || hasOwn(payload, "title"))
    record.title = normalizeRequiredText(payload.title, "Title");
  if (!isUpdate || hasOwn(payload, "company"))
    record.company = normalizeRequiredText(payload.company, "Company");
  if (!isUpdate || hasOwn(payload, "description"))
    record.description = normalizeRequiredText(
      payload.description,
      "Description",
    );
  if (!isUpdate || hasOwn(payload, "jd_link"))
    record.jd_link = normalizeJdLink(payload.jd_link);
  if (!isUpdate || hasOwn(payload, "skills")) {
    const normalizedSkills = normalizeSkills(payload.skills);
    if (normalizedSkills.length === 0)
      throw createBadRequestError("At least one skill is required");
    record.skills = normalizedSkills;
  }
  if (!isUpdate || hasOwn(payload, "experience"))
    record.experience = normalizeRequiredText(payload.experience, "Experience");
  if (!isUpdate || hasOwn(payload, "work_mode"))
    record.work_mode = normalizeEnum(
      payload.work_mode,
      WORK_MODES,
      "Work mode",
    );
  if (!isUpdate || hasOwn(payload, "notice_period"))
    record.notice_period = normalizeRequiredText(
      payload.notice_period,
      "Notice period",
    );
  if (!isUpdate || hasOwn(payload, "interview_mode"))
    record.interview_mode = normalizeInterviewModes(payload.interview_mode);
  if (!isUpdate || hasOwn(payload, "location"))
    record.location = normalizeRequiredText(payload.location, "Location");
  if (!isUpdate || hasOwn(payload, "ctc"))
    record.ctc = normalizeRequiredText(payload.ctc, "CTC");
  if (!isUpdate || hasOwn(payload, "valid_till"))
    record.valid_till = normalizeValidTill(payload.valid_till, "Valid till"); // ← now ISO datetime
  if (!isUpdate || hasOwn(payload, "status")) {
    const normalizedStatus = normalizeStatus(payload.status);
    if (normalizedStatus) record.status = normalizedStatus;
    if (!isUpdate && !normalizedStatus) record.status = "active";
  }
  return record;
}

async function saveJobQuestions(supabase, jobId, questions) {
  const { error: deleteError } = await supabase
    .from("job_questions")
    .delete()
    .eq("job_id", jobId);
  if (deleteError) throw deleteError;
  if (!questions || questions.length === 0) return [];
  const { data, error } = await supabase
    .from("job_questions")
    .insert(questions.map((q) => ({ job_id: jobId, ...q })))
    .select("*");
  if (error) throw error;
  return data || [];
}

// Auto-close any active jobs whose valid_till has passed
// Called inside listJobs so it fires on every fetch — lightweight, index-backed
async function autoCloseExpiredJobs(supabase) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "closed", updated_at: now })
    .eq("status", "active")
    .lt("valid_till", now);
  // Non-fatal — log but don't throw so listJobs still works
  if (error) console.error("[autoCloseExpiredJobs]", error.message);
}

async function listJobs({ actor } = {}) {
  const supabase = getReadClient();

  // Auto-close expired jobs on every fetch (admin client handles it silently)
  const adminSupabase = getSupabaseAdmin();
  if (adminSupabase) {
    await autoCloseExpiredJobs(adminSupabase).catch(() => {});
  }

  let query = supabase.from("jobs").select("*, job_questions(*)");

  if (actor?.role !== ROLES.ADMIN && actor?.role !== ROLES.SUPER_ADMIN) {
    const now = new Date().toISOString();
    // Students only see active jobs that haven't expired yet
    query = query.eq("status", "active").gt("valid_till", now);
  }

  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((job) => ({
    ...job,
    questions: Array.isArray(job.job_questions)
      ? [...job.job_questions].sort((a, b) => a.order_index - b.order_index)
      : [],
    job_questions: undefined,
  }));
}

async function createJob({ payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const questions = normalizeQuestions(payload.questions);
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

  const savedQuestions = await saveJobQuestions(supabase, data.id, questions);

  await notificationService.createBroadcastNotification({
    title: "New Job Posted",
    message: `New job "${data.title}" has been posted`,
    type: "job_posted",
    jwt,
  });

  // Send email notification to eligible students (fire-and-forget)
  emailService.notifyEligibleStudentsByEmail(data).catch((err) => {
    console.error("[jobService] Email notification failed:", err.message);
  });

  return { ...data, questions: savedQuestions };
}

async function updateJob({ jobId, payload, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const updatePayload = buildJobWritePayload(payload, { isUpdate: true });

  const { data, error } = await supabase
    .from("jobs")
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) throw error;

  if (hasOwn(payload, "questions")) {
    const questions = normalizeQuestions(payload.questions);
    const savedQuestions = await saveJobQuestions(supabase, jobId, questions);
    return { ...data, questions: savedQuestions };
  }

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
  if (isSoftDeletedJob(existing)) return true;

  const { error } = await supabase
    .from("jobs")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
  return true;
}

module.exports = { listJobs, createJob, updateJob, deleteJob };
