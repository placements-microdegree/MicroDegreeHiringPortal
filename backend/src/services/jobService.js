const {
  getSupabaseUser,
  getSupabaseAnon,
  getSupabaseAdmin,
} = require("../config/db");
const { ROLES } = require("../utils/constants");
const notificationService = require("./notificationService");

const WORK_MODES      = ["Remote", "Hybrid", "Onsite"];
const INTERVIEW_MODES = ["Online", "Offline", "Hybrid"];
const JOB_STATUSES    = ["active", "closed", "deleted"];
const MAX_QUESTIONS   = 5;

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
  const found = allowed.find((item) => item.toLowerCase() === normalized.toLowerCase());
  if (!found) throw createBadRequestError(`${fieldLabel} must be one of: ${allowed.join(", ")}`);
  return found;
}
function normalizeStatus(status) {
  const normalized = normalizeText(status);
  if (!normalized) return null;
  const lowered = normalized.toLowerCase();
  if (!JOB_STATUSES.includes(lowered))
    throw createBadRequestError(`Status must be one of: ${JOB_STATUSES.join(", ")}`);
  return lowered;
}
function normalizeDateText(value, fieldLabel) {
  const normalized = normalizeRequiredText(value, fieldLabel);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized))
    throw createBadRequestError(`${fieldLabel} must be in YYYY-MM-DD format`);
  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  const isInvalid =
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day;
  if (isInvalid) throw createBadRequestError(`${fieldLabel} must be a valid date`);
  return normalized;
}
function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.map((item) => normalizeText(item)).filter(Boolean);
  if (typeof skills === "string")
    return skills.split(",").map((item) => normalizeText(item)).filter(Boolean);
  if (skills === null || skills === undefined) return [];
  throw createBadRequestError("Skills must be a comma-separated string or an array");
}
function normalizeJdLink(link) {
  const normalized = normalizeRequiredText(link, "JD link");
  let parsed;
  try { parsed = new URL(normalized); } catch {
    throw createBadRequestError("JD link must be a valid URL");
  }
  const host = parsed.hostname.toLowerCase();
  if (!host.includes("drive.google.com") && !host.includes("docs.google.com"))
    throw createBadRequestError("JD link must be a Google Drive/Docs sharing URL");
  return normalized;
}

// interview_mode is now text[] — accepts array or single string (backward compat)
function normalizeInterviewModes(value) {
  let modes;
  if (Array.isArray(value)) {
    modes = value;
  } else if (typeof value === "string" && value.trim()) {
    modes = [value.trim()]; // backward compat for existing single-string data
  } else {
    throw createBadRequestError("Interview mode is required");
  }
  if (modes.length === 0) throw createBadRequestError("Select at least one interview mode");
  return modes.map((m) => {
    const found = INTERVIEW_MODES.find(
      (im) => im.toLowerCase() === String(m).trim().toLowerCase(),
    );
    if (!found)
      throw createBadRequestError(`Invalid interview mode "${m}". Must be one of: ${INTERVIEW_MODES.join(", ")}`);
    return found;
  });
}

// Validate and normalize custom questions from payload
function normalizeQuestions(questions) {
  if (!questions) return [];
  if (!Array.isArray(questions)) throw createBadRequestError("Questions must be an array");
  if (questions.length > MAX_QUESTIONS)
    throw createBadRequestError(`Maximum ${MAX_QUESTIONS} custom questions allowed`);
  return questions.map((q, i) => {
    const question = normalizeText(q?.question);
    if (!question) throw createBadRequestError(`Question ${i + 1} text is required`);
    const answerType = q?.answer_type || "text";
    if (!["text", "yesno"].includes(answerType))
      throw createBadRequestError(`Question ${i + 1} answer_type must be 'text' or 'yesno'`);
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
    record.description = normalizeRequiredText(payload.description, "Description");
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
    record.work_mode = normalizeEnum(payload.work_mode, WORK_MODES, "Work mode");
  if (!isUpdate || hasOwn(payload, "notice_period"))
    record.notice_period = normalizeRequiredText(payload.notice_period, "Notice period");
  if (!isUpdate || hasOwn(payload, "interview_mode"))
    record.interview_mode = normalizeInterviewModes(payload.interview_mode); // now text[]
  if (!isUpdate || hasOwn(payload, "location"))
    record.location = normalizeRequiredText(payload.location, "Location");
  if (!isUpdate || hasOwn(payload, "ctc"))
    record.ctc = normalizeRequiredText(payload.ctc, "CTC");
  if (!isUpdate || hasOwn(payload, "valid_till"))
    record.valid_till = normalizeDateText(payload.valid_till, "Valid till");
  if (!isUpdate || hasOwn(payload, "status")) {
    const normalizedStatus = normalizeStatus(payload.status);
    if (normalizedStatus) record.status = normalizedStatus;
    if (!isUpdate && !normalizedStatus) record.status = "active";
  }
  return record;
}

// Delete all existing questions for a job then insert the new ones
async function saveJobQuestions(supabase, jobId, questions) {
  const { error: deleteError } = await supabase
    .from("job_questions").delete().eq("job_id", jobId);
  if (deleteError) throw deleteError;
  if (!questions || questions.length === 0) return [];
  const { data, error } = await supabase
    .from("job_questions")
    .insert(questions.map((q) => ({ job_id: jobId, ...q })))
    .select("*");
  if (error) throw error;
  return data || [];
}

async function listJobs({ actor } = {}) {
  const supabase = getReadClient();
  // Include custom questions in every job fetch
  let query = supabase.from("jobs").select("*, job_questions(*)");

  // Only students (not admin/superadmin) get active+valid_till filter
  if (actor?.role !== ROLES.ADMIN && actor?.role !== ROLES.SUPER_ADMIN) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.eq("status", "active").gte("valid_till", today);
  }

  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((job) => ({
    ...job,
    questions: Array.isArray(job.job_questions)
      ? [...job.job_questions].sort((a, b) => a.order_index - b.order_index)
      : [],
    job_questions: undefined, // remove raw join key from response
  }));
}

async function createJob({ payload, actor, jwt }) {
  const supabase  = getWriteClient(jwt);
  const questions = normalizeQuestions(payload.questions);
  const record    = buildJobWritePayload(payload, { isUpdate: false });

  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...record, posted_by: actor?.id || null, status: record.status || "active" })
    .select("*")
    .single();
  if (error) throw error;

  const savedQuestions = await saveJobQuestions(supabase, data.id, questions);

  await notificationService.createNotificationsForStudents({
    title:   "New Job Posted",
    message: `New job "${data.title}" has been posted`,
    type:    "job_posted",
    jwt,
  });

  return { ...data, questions: savedQuestions };
}

async function updateJob({ jobId, payload, actor, jwt }) {
  const supabase      = getWriteClient(jwt);
  const updatePayload = buildJobWritePayload(payload, { isUpdate: true });

  const { data, error } = await supabase
    .from("jobs")
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) throw error;

  // Only update questions if they were explicitly included in the payload
  if (hasOwn(payload, "questions")) {
    const questions      = normalizeQuestions(payload.questions);
    const savedQuestions = await saveJobQuestions(supabase, jobId, questions);
    return { ...data, questions: savedQuestions };
  }

  return data;
}

async function deleteJob({ jobId, actor, jwt }) {
  const supabase = getWriteClient(jwt);
  const { data: existing, error: loadError } = await supabase
    .from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (loadError) throw loadError;
  if (!existing) return true;
  if (isSoftDeletedJob(existing)) return true;

  // Soft-delete — keeps application history intact
  const { error } = await supabase
    .from("jobs")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
  return true;
}

module.exports = { listJobs, createJob, updateJob, deleteJob };