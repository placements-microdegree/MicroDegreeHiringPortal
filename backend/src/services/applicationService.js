// FILE: services/applicationService.js

const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");
const { ROLES, APPLICATION_STATUSES } = require("../utils/constants");
const { MAX_RESUMES_PER_STUDENT } = require("./resumeService");

function getClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

const APPLICATIONS_ADMIN_SELECT = `
  id,
  status,
  created_at,
  updated_at,
  notice_period,
  relevant_experience,
  hands_on_primary_skills,
  work_mode_match,
  interview_mode_available,
  jd_confirmed,
  selected_resume_url,
  save_for_future,
  hr_comment,
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
    posted_by,
    interview_mode,
    work_mode,
    experience
  ),
  profiles:student_id!inner(
    full_name,
    email,
    phone,
    location,
    total_experience,
    current_ctc,
    expected_ctc,
    resumes(*)
  ),
  application_answers(
    id,
    question_id,
    answer_text,
    answer_bool,
    job_questions(id, question, answer_type, order_index)
  )
`;

function normalizeApplicationForAdminView(row) {
  const answers = Array.isArray(row.application_answers)
    ? row.application_answers
        .map((a) => ({
          question_id: a.question_id,
          question: a.job_questions?.question || "",
          answer_type: a.job_questions?.answer_type || "text",
          order_index: a.job_questions?.order_index ?? 0,
          answer_text: a.answer_text,
          answer_bool: a.answer_bool,
        }))
        .sort((a, b) => a.order_index - b.order_index)
    : [];

  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    notice_period: row.notice_period,
    relevant_experience: row.relevant_experience,
    hands_on_primary_skills: row.hands_on_primary_skills,
    work_mode_match: row.work_mode_match,
    interview_mode_available: row.interview_mode_available,
    jd_confirmed: row.jd_confirmed,
    selected_resume_url: row.selected_resume_url,
    save_for_future: row.save_for_future,
    hr_comment: row.hr_comment ?? null,
    answers,
    job: row.jobs
      ? {
          id: row.jobs.id,
          title: row.jobs.title,
          company: row.jobs.company,
          ctc: row.jobs.ctc,
          skills: row.jobs.skills,
          location: row.jobs.location,
          status: row.jobs.status,
          interview_mode: row.jobs.interview_mode,
          work_mode: row.jobs.work_mode,
          experience: row.jobs.experience,
        }
      : null,
    student: row.profiles
      ? {
          id: row.student_id,
          full_name: row.profiles.full_name,
          email: row.profiles.email,
          phone: row.profiles.phone,
          location: row.profiles.location,
          total_experience: row.profiles.total_experience,
          current_ctc: row.profiles.current_ctc,
          expected_ctc: row.profiles.expected_ctc,
          resumes: Array.isArray(row.profiles.resumes)
            ? row.profiles.resumes
            : [],
        }
      : null,
  };
}

function toOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function toOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  const err = new Error(`${fieldName} must be boolean`);
  err.status = 400;
  throw err;
}

async function saveApplicationAnswers(supabase, applicationId, answers) {
  if (!Array.isArray(answers) || answers.length === 0) return;
  const rows = answers
    .filter((a) => a?.questionId)
    .map((a) => ({
      application_id: applicationId,
      question_id: a.questionId,
      answer_text:
        a.answerType === "text" ? (toOptionalText(a.answer) ?? null) : null,
      answer_bool:
        a.answerType === "yesno"
          ? typeof a.answer === "boolean"
            ? a.answer
            : null
          : null,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("application_answers").insert(rows);
  if (error) throw error;
}

async function createApplication({ payload, jwt }) {
  const supabase = getClient(jwt);
  const selectedResumeUrl = toOptionalText(payload.selectedResumeUrl);
  const jdConfirmed = payload.jdConfirmed === true;
  const saveForFuture = payload.saveForFuture === true;
  const customAnswers = Array.isArray(payload.answers) ? payload.answers : [];

  if (!selectedResumeUrl) {
    const err = new Error("Resume selection is required");
    err.status = 400;
    throw err;
  }
  if (!jdConfirmed) {
    const err = new Error("JD confirmation is required");
    err.status = 400;
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_eligible, eligible_until, application_quota")
    .eq("id", payload.studentId)
    .maybeSingle();
  if (profileError) throw profileError;

  const isEligibleForWindow = profile?.is_eligible === true;
  const eligibleUntil = profile?.eligible_until
    ? new Date(profile.eligible_until)
    : null;

  if (isEligibleForWindow) {
    if (
      !eligibleUntil ||
      Number.isNaN(eligibleUntil.getTime()) ||
      new Date() > eligibleUntil
    ) {
      const err = new Error("Eligibility window has expired");
      err.status = 403;
      throw err;
    }
  }

  const { data: alreadyApplied, error: alreadyAppliedError } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", payload.studentId)
    .eq("job_id", payload.jobId)
    .maybeSingle();
  if (alreadyAppliedError) throw alreadyAppliedError;
  if (alreadyApplied?.id) {
    const err = new Error("Already applied for this job");
    err.status = 409;
    throw err;
  }

  let reservedQuota = null;
  if (!isEligibleForWindow) {
    const currentQuota = Number(profile?.application_quota ?? 0);
    if (!Number.isFinite(currentQuota) || currentQuota <= 0) {
      const err = new Error("Application quota exhausted");
      err.status = 403;
      throw err;
    }
    const { data: quotaUpdated, error: quotaUpdateError } = await supabase
      .from("profiles")
      .update({
        application_quota: currentQuota - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.studentId)
      .eq("application_quota", currentQuota)
      .select("application_quota")
      .maybeSingle();
    if (quotaUpdateError) throw quotaUpdateError;
    if (!quotaUpdated) {
      const err = new Error(
        "Application quota update conflict. Please try again.",
      );
      err.status = 409;
      throw err;
    }
    reservedQuota = currentQuota;
  }

  const { data: resumeRows, error: resumeError } = await supabase
    .from("resumes")
    .select("id, file_url")
    .eq("user_id", payload.studentId);
  if (resumeError) throw resumeError;
  if ((resumeRows || []).length > MAX_RESUMES_PER_STUDENT) {
    const err = new Error(
      `Maximum ${MAX_RESUMES_PER_STUDENT} resumes are allowed`,
    );
    err.status = 400;
    throw err;
  }
  const selectedResume = (resumeRows || []).find(
    (r) => r.file_url === selectedResumeUrl,
  );
  if (!selectedResume) {
    const err = new Error("Selected resume is invalid");
    err.status = 400;
    throw err;
  }

  let data;
  try {
    const { data: inserted, error } = await supabase
      .from("applications")
      .insert({
        student_id: payload.studentId,
        job_id: payload.jobId,
        status: payload.status || "Applied",
        notice_period: toOptionalText(payload.noticePeriod),
        relevant_experience: toOptionalText(payload.relevantExperience),
        hands_on_primary_skills: toOptionalBoolean(
          payload.handsOnPrimarySkills,
          "handsOnPrimarySkills",
        ),
        work_mode_match: toOptionalBoolean(
          payload.workModeMatch,
          "workModeMatch",
        ),
        interview_mode_available: toOptionalBoolean(
          payload.interviewModeAvailable,
          "interviewModeAvailable",
        ),
        jd_confirmed: jdConfirmed,
        selected_resume_url: selectedResumeUrl,
        save_for_future: saveForFuture,
      })
      .select("*")
      .single();
    if (error) throw error;
    data = inserted;
  } catch (insertError) {
    if (reservedQuota !== null) {
      await supabase
        .from("profiles")
        .update({ application_quota: reservedQuota })
        .eq("id", payload.studentId)
        .eq("application_quota", reservedQuota - 1);
    }
    throw insertError;
  }

  if (customAnswers.length > 0) {
    await saveApplicationAnswers(supabase, data.id, customAnswers);
  }

  if (saveForFuture) {
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        is_currently_working:
          typeof payload.isCurrentlyWorking === "boolean"
            ? payload.isCurrentlyWorking
            : null,
        total_experience: toOptionalText(payload.totalExperience),
        current_ctc: toOptionalText(payload.currentCTC),
        expected_ctc: toOptionalText(payload.expectedCTC),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.studentId);
    if (profileUpdateError) throw profileUpdateError;
  }

  return data;
}

// ── NEW: HR applies on behalf of a student ────────────────────────────────────
// Bypasses eligibility/quota checks entirely — HR is trusted actor
async function applyOnBehalf({ payload, jwt }) {
  const supabase = getClient(jwt);

  const studentId = payload.studentId;
  const jobId = payload.jobId;

  if (!studentId) {
    const err = new Error("Student is required");
    err.status = 400;
    throw err;
  }
  if (!jobId) {
    const err = new Error("Job is required");
    err.status = 400;
    throw err;
  }

  // Check for duplicate
  const { data: alreadyApplied, error: dupError } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", studentId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (dupError) throw dupError;
  if (alreadyApplied?.id) {
    const err = new Error("Student has already applied for this job");
    err.status = 409;
    throw err;
  }

  const customAnswers = Array.isArray(payload.answers) ? payload.answers : [];

  const { data, error } = await supabase
    .from("applications")
    .insert({
      student_id: studentId,
      job_id: jobId,
      status: "Applied",
      notice_period: toOptionalText(payload.noticePeriod),
      relevant_experience: toOptionalText(payload.relevantExperience),
      hands_on_primary_skills: toOptionalBoolean(
        payload.handsOnPrimarySkills,
        "handsOnPrimarySkills",
      ),
      work_mode_match: toOptionalBoolean(
        payload.workModeMatch,
        "workModeMatch",
      ),
      interview_mode_available: toOptionalBoolean(
        payload.interviewModeAvailable,
        "interviewModeAvailable",
      ),
      jd_confirmed: true, // HR confirms on behalf
      selected_resume_url: toOptionalText(payload.selectedResumeUrl) || null,
      save_for_future: false,
      hr_comment:
        toOptionalText(payload.hrNote) || "Applied by HR on behalf of student",
    })
    .select("*")
    .single();
  if (error) throw error;

  if (customAnswers.length > 0) {
    await saveApplicationAnswers(supabase, data.id, customAnswers);
  }

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
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATIONS_ADMIN_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeApplicationForAdminView);
}

async function updateApplicationStatus({ applicationId, status, actor, jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateApplicationComment({ applicationId, comment, jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("applications")
    .update({
      hr_comment: toOptionalText(comment),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("id, hr_comment")
    .single();
  if (error) throw error;
  return data;
}

async function deleteApplication({ applicationId, jwt }) {
  const supabase = getClient(jwt);

  const { data: existing, error: lookupError } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    const err = new Error("Application not found");
    err.status = 404;
    throw err;
  }

  const { error: answersError } = await supabase
    .from("application_answers")
    .delete()
    .eq("application_id", applicationId);
  if (answersError) throw answersError;

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId);
  if (error) throw error;

  return { id: applicationId };
}

async function getStudentAnalytics({ studentId, jwt }) {
  const supabase = getClient(jwt);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: totalJobs, error: jobsError },
    { data: apps, error: appsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("valid_till", today),
    supabase.from("applications").select("status").eq("student_id", studentId),
    supabase
      .from("profiles")
      .select("is_eligible, eligible_until, application_quota")
      .eq("id", studentId)
      .maybeSingle(),
  ]);

  if (jobsError) throw jobsError;
  if (appsError) throw appsError;
  if (profileError) throw profileError;

  const statusCounts = APPLICATION_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {});
  (apps || []).forEach((a) => {
    const s = String(a?.status || "").trim();
    if (!s) return;
    if (!Object.hasOwn(statusCounts, s)) statusCounts[s] = 0;
    statusCounts[s] += 1;
  });

  const eligibility = profile?.is_eligible
    ? { type: "eligible_until", eligibleUntil: profile?.eligible_until || null }
    : {
        type: "quota",
        remainingApplications: Number(profile?.application_quota ?? 0),
      };

  return {
    totalJobs: totalJobs || 0,
    totalApplications: (apps || []).length,
    statusCounts,
    eligibility,
  };
}

module.exports = {
  createApplication,
  applyOnBehalf,
  listApplicationsByStudent,
  listAllApplications,
  updateApplicationStatus,
  updateApplicationComment,
  deleteApplication,
  getStudentAnalytics,
  normalizeApplicationForAdminView,
};
