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
    notice_period: row.notice_period,
    relevant_experience: row.relevant_experience,
    hands_on_primary_skills: row.hands_on_primary_skills,
    work_mode_match: row.work_mode_match,
    interview_mode_available: row.interview_mode_available,
    jd_confirmed: row.jd_confirmed,
    selected_resume_url: row.selected_resume_url,
    save_for_future: row.save_for_future,
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

async function createApplication({ payload, jwt }) {
  const supabase = getClient(jwt);

  const selectedResumeUrl = toOptionalText(payload.selectedResumeUrl);
  const jdConfirmed = payload.jdConfirmed === true;
  const saveForFuture = payload.saveForFuture === true;

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
    (resumeRow) => resumeRow.file_url === selectedResumeUrl,
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

  const statusCounts = APPLICATION_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  (apps || []).forEach((application) => {
    const normalizedStatus = String(application?.status || "").trim();
    if (!normalizedStatus) return;
    if (!Object.hasOwn(statusCounts, normalizedStatus)) {
      statusCounts[normalizedStatus] = 0;
    }
    statusCounts[normalizedStatus] += 1;
  });

  const eligibility = profile?.is_eligible
    ? {
        type: "eligible_until",
        eligibleUntil: profile?.eligible_until || null,
      }
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
  listApplicationsByStudent,
  listAllApplications,
  updateApplicationStatus,
  getStudentAnalytics,
  normalizeApplicationForAdminView,
};
