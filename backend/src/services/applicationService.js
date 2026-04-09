// FILE: services/applicationService.js

const { getSupabaseUser, getSupabaseAdmin } = require("../config/db");
const { ROLES, APPLICATION_STATUSES } = require("../utils/constants");
const { MAX_RESUMES_PER_STUDENT } = require("./resumeService");
const aiCommentService = require("./aiCommentService");

function getClient(jwt) {
  const admin = getSupabaseAdmin();
  return admin || getSupabaseUser(jwt);
}

const APPLICATIONS_ADMIN_SELECT = `
  id,
  status,
  stage,
  sub_stage,
  is_applied_on_behalf,
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
  student_concern,
  hr_comment,
  hr_comment_2,
  hr_comment_type,
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
    is_eligible,
    eligible_until,
    cloud_drive_status,
    drive_cleared_date,
    cloud_drive_status_history,
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

const CAREER_PROGRESS_ALLOWED_STATUSES = new Set([
  "Interview scheduled",
  "Technical Round",
  "Screening call Received",
  "final Round",
  "Placed",
]);

const CAREER_PROGRESS_STATUS_ORDER = [
  "Screening call Received",
  "Interview scheduled",
  "Technical Round",
  "final Round",
  "Placed",
];

const CAREER_PROGRESS_STATUS_RANK = CAREER_PROGRESS_STATUS_ORDER.reduce(
  (acc, status, index) => {
    acc[status] = index;
    return acc;
  },
  {},
);

function normalizeCareerProgressStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return "";

  const normalized = normalizePipelineFromStatus(raw, null, raw).status;
  if (CAREER_PROGRESS_ALLOWED_STATUSES.has(normalized)) return normalized;

  const lowered = raw.toLowerCase();
  if (
    lowered === "interview schedu" ||
    lowered === "interview schedule" ||
    lowered === "interview scheduled"
  ) {
    return "Interview scheduled";
  }
  if (lowered === "technical round") return "Technical Round";
  if (
    lowered === "screening call received" ||
    lowered === "shortlisted" ||
    lowered === "screening call recieved"
  ) {
    return "Screening call Received";
  }
  if (lowered === "final round") return "final Round";
  if (lowered === "job on hold") return "Job on hold";
  if (
    lowered === "position close" ||
    lowered === "position closed" ||
    lowered === "job on hold/ position closed"
  ) {
    return "Position closed";
  }
  if (lowered === "placed" || lowered === "selected") return "Placed";

  return normalized;
}

function normalizePipelineFromStatus(inputStatus, inputStage, inputSubStage) {
  const rawStatus = String(inputSubStage || inputStatus || "Applied").trim();

  const statusAliases = {
    Shortlisted: "Screening call Received",
    "Resume Screening Rejected": "Resume Not Matched",
    "Profile Mapped for client": "Mapped to Client",
    "Interview Scheduled": "Interview scheduled",
    Interview: "Interview scheduled",
    "Final Round": "final Round",
    "Client Rejected": "screening Discolified",
    Rejected: "screening Discolified",
    "Position Closed": "Position closed",
    "Job on hold/ position closed": "Position closed",
    Selected: "Placed",
  };

  const normalizedStatus = statusAliases[rawStatus] || rawStatus;

  const stageByStatus = {
    Applied: "Applied",
    "Resume Not Matched": "Screening",
    "Mapped to Client": "Mapped",
    "Screening call Received": "Screening",
    "screening Discolified": "Screening",
    "Interview scheduled": "Interview",
    "Interview Not Cleared": "Interview",
    "Technical Round": "Interview",
    "final Round": "Final",
    Placed: "Closed",
    "Job on hold": "Closed",
    "Position closed": "Closed",
  };

  const mappedStage = stageByStatus[normalizedStatus] || null;

  return {
    status: normalizedStatus,
    sub_stage: normalizedStatus,
    // Prefer canonical stage from status to satisfy DB stage/sub_stage constraints.
    stage: mappedStage || inputStage || "Applied",
  };
}

function normalizeApplicationForAdminView(row) {
  const hrComment = row.hr_comment ?? null;
  const isAppliedOnBehalf =
    row.is_applied_on_behalf === true ||
    String(hrComment || "")
      .toLowerCase()
      .includes("applied by hr on behalf of student");

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
    stage: row.stage || null,
    sub_stage: row.sub_stage || row.status,
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
    student_concern: row.student_concern ?? null,
    hr_comment: hrComment,
    hr_comment_2: row.hr_comment_2 ?? null,
    hr_comment_type: row.hr_comment_type || "Internal",
    is_applied_on_behalf: isAppliedOnBehalf,
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
          posted_by: row.jobs.posted_by,
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
          is_eligible: row.profiles.is_eligible,
          eligible_until: row.profiles.eligible_until,
          cloud_drive_status: row.profiles.cloud_drive_status,
          drive_cleared_date: row.profiles.drive_cleared_date,
          cloud_drive_status_history: row.profiles.cloud_drive_status_history,
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

  const pipeline = normalizePipelineFromStatus(payload.status);

  let data;
  try {
    const { data: inserted, error } = await supabase
      .from("applications")
      .insert({
        student_id: payload.studentId,
        job_id: payload.jobId,
        status: pipeline.status,
        stage: pipeline.stage,
        sub_stage: pipeline.sub_stage,
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
        student_concern: toOptionalText(payload.studentConcern),
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

async function updateStudentApplication({
  applicationId,
  studentId,
  payload,
  jwt,
}) {
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

  const { data: existing, error: existingError } = await supabase
    .from("applications")
    .select("id, job_id")
    .eq("id", applicationId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) {
    const err = new Error("Application not found");
    err.status = 404;
    throw err;
  }

  const { data: jobRow, error: jobError } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", existing.job_id)
    .maybeSingle();
  if (jobError) throw jobError;

  const jobStatus = String(jobRow?.status || "")
    .trim()
    .toLowerCase();
  if (jobStatus && !["active", "closed"].includes(jobStatus)) {
    const err = new Error(
      "You can update this application only while the job is active or closed",
    );
    err.status = 403;
    throw err;
  }

  const { data: resumeRows, error: resumeError } = await supabase
    .from("resumes")
    .select("id, file_url")
    .eq("user_id", studentId);
  if (resumeError) throw resumeError;
  const selectedResume = (resumeRows || []).find(
    (r) => r.file_url === selectedResumeUrl,
  );
  if (!selectedResume) {
    const err = new Error("Selected resume is invalid");
    err.status = 400;
    throw err;
  }

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update({
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
      student_concern: toOptionalText(payload.studentConcern),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("student_id", studentId)
    .select("*")
    .single();
  if (updateError) throw updateError;

  const { error: deleteAnswersError } = await supabase
    .from("application_answers")
    .delete()
    .eq("application_id", applicationId);
  if (deleteAnswersError) throw deleteAnswersError;

  if (customAnswers.length > 0) {
    await saveApplicationAnswers(supabase, applicationId, customAnswers);
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
      .eq("id", studentId);
    if (profileUpdateError) throw profileUpdateError;
  }

  return updated;
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

  const pipeline = normalizePipelineFromStatus(payload.status || "Applied");

  const { data, error } = await supabase
    .from("applications")
    .insert({
      student_id: studentId,
      job_id: jobId,
      status: pipeline.status,
      stage: pipeline.stage,
      sub_stage: pipeline.sub_stage,
      is_applied_on_behalf: true,
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
      hr_comment_type: "Internal",
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

async function updateApplicationStatus({
  applicationId,
  status,
  stage,
  subStage,
  actor,
  jwt,
}) {
  const supabase = getClient(jwt);
  const pipeline = normalizePipelineFromStatus(status, stage, subStage);
  const { data, error } = await supabase
    .from("applications")
    .update({
      status: pipeline.status,
      stage: pipeline.stage,
      sub_stage: pipeline.sub_stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateApplicationComment({
  applicationId,
  comment,
  comment2,
  aiSuggestionId,
  aiApproved,
  actorId,
  jwt,
}) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("applications")
    .update({
      hr_comment: toOptionalText(comment),
      hr_comment_2: toOptionalText(comment2),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("id, hr_comment, hr_comment_2")
    .single();
  if (error) throw error;

  const { error: historyError } = await supabase
    .from("application_comment_history")
    .insert({
      application_id: applicationId,
      actor_id: actorId || null,
      hr_comment: data.hr_comment,
      hr_comment_2: data.hr_comment_2,
    });
  if (historyError) throw historyError;

  if (aiSuggestionId || aiApproved === true) {
    await aiCommentService.logAiApprovalEvent({
      applicationId,
      suggestionId: aiSuggestionId || null,
      actorId,
      jwt,
      approved: aiApproved === true,
    });
  }

  return data;
}

async function listApplicationCommentHistory({
  applicationId,
  jwt,
  limit = 50,
}) {
  const supabase = getClient(jwt);

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(200, Number(limit)))
    : 50;

  const { data, error } = await supabase
    .from("application_comment_history")
    .select(
      "id, application_id, actor_id, hr_comment, hr_comment_2, created_at",
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return data || [];
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
    supabase
      .from("applications")
      .select("status, sub_stage")
      .eq("student_id", studentId),
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
    const s = String(a?.sub_stage || a?.status || "").trim();
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

async function generateAiCommentSuggestion({
  applicationId,
  jwt,
  actorId,
  regenerate,
}) {
  return aiCommentService.generateApplicationCommentSuggestion({
    applicationId,
    jwt,
    actorId,
    regenerate: regenerate === true,
  });
}

async function listCareerProgressBoard({ studentId, jwt }) {
  const supabase = getClient(jwt);
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, sub_stage, updated_at, created_at, student_id, jobs!inner(company,title), profiles:student_id!inner(full_name)",
    )
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) throw error;

  const latestByCompanyAndStudent = new Map();

  for (const row of data || []) {
    const normalized = normalizeCareerProgressStatus(
      row?.sub_stage || row?.status,
    );

    if (!CAREER_PROGRESS_ALLOWED_STATUSES.has(normalized)) continue;

    const companyName = String(row?.jobs?.company || "").trim();
    const jobTitle = String(row?.jobs?.title || "").trim() || "Job Role";
    const otherStudentId = String(row?.student_id || "").trim();
    const studentName =
      String(row?.profiles?.full_name || "").trim() || "Student";

    if (!companyName || !otherStudentId) continue;

    const key = `${companyName}::${jobTitle}::${otherStudentId}`;
    if (latestByCompanyAndStudent.has(key)) continue;

    latestByCompanyAndStudent.set(key, {
      companyName,
      jobTitle,
      studentName,
      recruitmentPhase: normalized,
      updatedAt: row?.updated_at || row?.created_at || null,
    });
  }

  const grouped = new Map();

  for (const item of latestByCompanyAndStudent.values()) {
    const key = `${item.companyName.toLowerCase()}::${item.jobTitle.toLowerCase()}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        companyName: item.companyName,
        jobTitle: item.jobTitle,
        lastUpdatedAt: item.updatedAt,
        students: [
          {
            studentName: item.studentName,
            recruitmentPhase: item.recruitmentPhase,
          },
        ],
      });
      continue;
    }

    const existingTime = new Date(existing.lastUpdatedAt || 0).getTime();
    const nextTime = new Date(item.updatedAt || 0).getTime();
    if (nextTime > existingTime) {
      existing.lastUpdatedAt = item.updatedAt;
    }

    existing.students.push({
      studentName: item.studentName,
      recruitmentPhase: item.recruitmentPhase,
    });
  }

  return Array.from(grouped.values())
    .map((companyGroup) => ({
      companyName: companyGroup.companyName,
      jobTitle: companyGroup.jobTitle,
      students: companyGroup.students.sort((a, b) => {
        const rankA = CAREER_PROGRESS_STATUS_RANK[a.recruitmentPhase] ?? 999;
        const rankB = CAREER_PROGRESS_STATUS_RANK[b.recruitmentPhase] ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.studentName.localeCompare(b.studentName);
      }),
      lastUpdatedAt: companyGroup.lastUpdatedAt,
    }))
    .sort((a, b) => {
      const timeA = new Date(a.lastUpdatedAt || 0).getTime();
      const timeB = new Date(b.lastUpdatedAt || 0).getTime();
      return timeB - timeA;
    })
    .map((item) => ({
      companyName: item.companyName,
      jobTitle: item.jobTitle,
      students: item.students,
    }));
}

module.exports = {
  createApplication,
  updateStudentApplication,
  applyOnBehalf,
  listApplicationsByStudent,
  listAllApplications,
  updateApplicationStatus,
  updateApplicationComment,
  listApplicationCommentHistory,
  deleteApplication,
  getStudentAnalytics,
  generateAiCommentSuggestion,
  listCareerProgressBoard,
  normalizeApplicationForAdminView,
};
