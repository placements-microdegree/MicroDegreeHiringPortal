const { getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");

const APPLICATION_FETCH_BATCH_SIZE = 75;

function requireAdminClient() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const err = new Error(
      "Service role key is required for this operation (super admin only)",
    );
    err.status = 500;
    throw err;
  }
  return supabase;
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchApplicationsByStudentIds({
  supabase,
  studentIds,
  selectColumns,
}) {
  const batches = chunkArray(studentIds, APPLICATION_FETCH_BATCH_SIZE);

  const responses = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("applications")
        .select(selectColumns)
        .in("student_id", batch)
        .order("created_at", { ascending: false })
        .order("updated_at", { ascending: false }),
    ),
  );

  const firstError = responses.find((response) => response?.error)?.error;
  if (firstError) throw firstError;

  return responses.flatMap((response) => response?.data || []);
}

async function fetchLatestActivityByStudentIds({ supabase, studentIds }) {
  const batches = chunkArray(studentIds, APPLICATION_FETCH_BATCH_SIZE);

  const responses = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("user_daily_activity")
        .select("user_id, activity_date, last_activity_at")
        .in("user_id", batch)
        .order("activity_date", { ascending: false })
        .order("last_activity_at", { ascending: false }),
    ),
  );

  const firstError = responses.find((response) => response?.error)?.error;
  if (firstError) {
    // If migration is not yet applied, skip activity data gracefully.
    if (firstError.code === "42P01") return [];
    throw firstError;
  }

  return responses.flatMap((response) => response?.data || []);
}

async function fetchProfileInternalNotesByStudentIds({ supabase, studentIds }) {
  const batches = chunkArray(studentIds, APPLICATION_FETCH_BATCH_SIZE);

  const responses = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("profile_internal_notes")
        .select("id, student_id, note, source, created_at, created_by")
        .in("student_id", batch)
        .order("created_at", { ascending: false }),
    ),
  );

  const firstError = responses.find((response) => response?.error)?.error;
  if (firstError) {
    if (firstError.code === "42P01") return [];
    throw firstError;
  }

  return responses.flatMap((response) => response?.data || []);
}

async function fetchResumeMetaByStudentIds({ supabase, studentIds }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return [];

  const batches = chunkArray(studentIds, APPLICATION_FETCH_BATCH_SIZE);

  let responses = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("resumes")
        .select(
          "id, user_id, file_name, file_url, approval_status, rejection_reason, approved_at, created_at",
        )
        .in("user_id", batch)
        .order("created_at", { ascending: false }),
    ),
  );

  let firstError = responses.find((response) => response?.error)?.error;
  if (firstError) {
    responses = await Promise.all(
      batches.map((batch) =>
        supabase
          .from("resumes")
          .select("id, user_id, file_name, file_url, created_at")
          .in("user_id", batch)
          .order("created_at", { ascending: false }),
      ),
    );
    firstError = responses.find((response) => response?.error)?.error;
  }

  if (firstError) {
    if (firstError.code === "42P01") return [];
    throw firstError;
  }

  return responses
    .flatMap((response) => response?.data || [])
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      file_name: row.file_name,
      file_url: row.file_url || null,
      approval_status: row.approval_status || "PENDING",
      rejection_reason: row.rejection_reason || null,
      approved_at: row.approved_at || null,
      created_at: row.created_at,
    }));
}

async function fetchResumeMetaByStudentId({ supabase, studentId }) {
  const rows = await fetchResumeMetaByStudentIds({
    supabase,
    studentIds: [studentId],
  });
  return rows.filter((row) => row.user_id === studentId);
}

async function listUsersPage(adminApi, page, perPage) {
  // Support both old and new API shapes:
  // - listUsers({ page, perPage })
  // - listUsers(page, perPage)
  if (typeof adminApi.listUsers !== "function") {
    throw new TypeError("Supabase Admin API does not support listUsers");
  }

  let result;
  try {
    result = await adminApi.listUsers({ page, perPage });
  } catch {
    result = await adminApi.listUsers(page, perPage);
  }

  const users = result?.data?.users || [];
  const error = result?.error || null;
  return { users, error };
}

async function findUserByEmail(supabase, email) {
  const adminApi = supabase.auth?.admin;
  if (!adminApi) return null;

  if (typeof adminApi.getUserByEmail === "function") {
    const { data, error } = await adminApi.getUserByEmail(email);
    if (error) throw error;
    return data?.user || null;
  }

  const target = normalizeEmail(email);
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { users, error } = await listUsersPage(adminApi, page, perPage);
    if (error) throw error;
    if (!users.length) break;

    const found = users.find((u) => normalizeEmail(u?.email) === target);
    if (found) return found;

    if (users.length < perPage) break;
  }

  return null;
}

async function updateUserRole(supabase, userId, user, targetRole) {
  const appMetadata = user?.app_metadata
    ? { ...user.app_metadata, role: targetRole }
    : { role: targetRole };
  const userMetadata = user?.user_metadata
    ? { ...user.user_metadata, role: targetRole }
    : { role: targetRole };

  const { data: updatedUser, error: updateError } =
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
  if (updateError) throw updateError;
  return updatedUser;
}

async function grantAccessByEmailIfUserMissing(supabase, email, targetRole) {
  const adminApi = supabase.auth?.admin;

  if (typeof adminApi?.inviteUserByEmail === "function") {
    const { data, error } = await adminApi.inviteUserByEmail(email, {
      data: { role: targetRole },
    });

    if (error) throw error;
    return {
      mode: "invited",
      user: data?.user || null,
      message:
        "Access granted by email. Ask this user to sign in using the same email to continue as ADMIN.",
    };
  }

  // Last-resort fallback for environments without invite API support.
  const randomPassword = `${Math.random().toString(36).slice(2)}A!9z${Date.now()}`;
  const { data, error } = await adminApi.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    app_metadata: { role: targetRole },
    user_metadata: { role: targetRole },
  });
  if (error) throw error;

  return {
    mode: "created",
    user: data?.user || null,
    message:
      "Access user created with admin role. User can continue with sign-in using this email.",
  };
}

async function promoteByEmail({ email, targetRole = ROLES.ADMIN }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.status = 400;
    throw err;
  }

  const supabase = requireAdminClient();

  const user = await findUserByEmail(supabase, normalizedEmail);

  if (!user) {
    const grantResult = await grantAccessByEmailIfUserMissing(
      supabase,
      normalizedEmail,
      targetRole,
    );

    return {
      profile: null,
      user: grantResult.user,
      pendingAccess: true,
      message: grantResult.message,
    };
  }

  const updatedUser = await updateUserRole(supabase, user.id, user, targetRole);

  const { error: profileError, data: profile } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        full_name: user.user_metadata?.full_name || user.email,
        phone: user.user_metadata?.phone || null,
        role: targetRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (profileError) throw profileError;

  return {
    user: updatedUser,
    profile,
    pendingAccess: false,
    message: "Access granted successfully",
  };
}

async function listProfiles({ role } = {}) {
  const supabase = requireAdminClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url",
    )
    // Some deployments created `profiles` without a created_at column; avoid hard‑requiring it.
    .order("updated_at", { ascending: false });
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function listStudentsWithLatestApplication() {
  const supabase = requireAdminClient();

  let students = [];
  {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, location, preferred_location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url, current_ctc, expected_ctc, total_experience, cloud_drive_status, drive_cleared_date, drive_cleared_status, cloud_drive_status_history, job_search_status, internal_flags, active_resume_id, profile_completion_percentage",
      )
      .eq("role", ROLES.STUDENT)
      .order("updated_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, role, location, preferred_location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url, cloud_drive_status, drive_cleared_date, drive_cleared_status, cloud_drive_status_history, job_search_status, internal_flags, active_resume_id, profile_completion_percentage",
        )
        .eq("role", ROLES.STUDENT)
        .order("updated_at", { ascending: false });

      if (fallbackError) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, phone, role, location, preferred_location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url",
          )
          .eq("role", ROLES.STUDENT)
          .order("updated_at", { ascending: false });

        if (legacyError) throw legacyError;
        students = legacyData || [];
      } else {
        students = fallbackData || [];
      }
    } else {
      students = data || [];
    }
  }

  if (!Array.isArray(students) || students.length === 0) return [];

  const studentIds = students.map((student) => student?.id).filter(Boolean);

  if (studentIds.length === 0) return students;

  let internalNotesByStudentId = new Map();
  let resumesByStudentId = new Map();

  {
    const [noteRows, resumeRows] = await Promise.all([
      fetchProfileInternalNotesByStudentIds({ supabase, studentIds }),
      fetchResumeMetaByStudentIds({ supabase, studentIds }),
    ]);

    if (Array.isArray(noteRows)) {
      internalNotesByStudentId = noteRows.reduce((acc, row) => {
        const list = acc.get(row.student_id) || [];
        list.push({
          id: row.id,
          note: row.note,
          source: row.source,
          created_at: row.created_at,
          created_by: row.created_by,
        });
        acc.set(row.student_id, list);
        return acc;
      }, new Map());
    }

    if (Array.isArray(resumeRows)) {
      resumesByStudentId = resumeRows.reduce((acc, row) => {
        const list = acc.get(row.user_id) || [];
        list.push({
          id: row.id,
          file_name: row.file_name,
          file_url: row.file_url || null,
          approval_status: row.approval_status || "PENDING",
          rejection_reason: row.rejection_reason || null,
          approved_at: row.approved_at || null,
          created_at: row.created_at,
        });
        acc.set(row.user_id, list);
        return acc;
      }, new Map());
    }
  }

  let latestActivityByStudentId = new Map();
  {
    const activityRows = await fetchLatestActivityByStudentIds({
      supabase,
      studentIds,
    });

    (activityRows || []).forEach((row) => {
      if (!row?.user_id || latestActivityByStudentId.has(row.user_id)) return;
      latestActivityByStudentId.set(row.user_id, row.last_activity_at || null);
    });
  }

  // Some DB deployments do not have current_ctc / expected_ctc / total_experience on applications.
  // Try the rich select first, then gracefully fall back to schema-safe columns.
  let applications = [];
  try {
    applications = await fetchApplicationsByStudentIds({
      supabase,
      studentIds,
      selectColumns:
        "id, student_id, current_ctc, expected_ctc, total_experience, relevant_experience, selected_resume_url, created_at, updated_at",
    });
  } catch {
    applications = await fetchApplicationsByStudentIds({
      supabase,
      studentIds,
      selectColumns:
        "id, student_id, relevant_experience, selected_resume_url, created_at, updated_at",
    });
  }

  const latestByStudentId = new Map();
  (applications || []).forEach((application) => {
    const studentId = application?.student_id;
    if (!studentId || latestByStudentId.has(studentId)) return;
    latestByStudentId.set(studentId, application);
  });

  return students.map((student) => {
    const latest = latestByStudentId.get(student.id) || null;
    const resumeRows = resumesByStudentId.get(student.id) || [];
    const activeResume = resumeRows.find(
      (resume) => String(resume?.id || "") === String(student?.active_resume_id || ""),
    );
    const latestUploadedResume = resumeRows[0] || null;
    const preferredResumeUrl =
      activeResume?.file_url || latestUploadedResume?.file_url || null;

    return {
      ...student,
      recent_application_current_ctc:
        latest?.current_ctc ?? student?.current_ctc ?? null,
      recent_application_expected_ctc:
        latest?.expected_ctc ?? student?.expected_ctc ?? null,
      recent_application_total_experience:
        latest?.total_experience ??
        latest?.relevant_experience ??
        student?.total_experience ??
        null,
      recent_application_resume_url:
        preferredResumeUrl ??
        latest?.selected_resume_url ??
        student?.resume_url ??
        null,
      recent_application_created_at: latest?.created_at ?? null,
      last_active_at: latestActivityByStudentId.get(student.id) || null,
      job_search_status: student?.job_search_status || "PASSIVE",
      internal_flags: Array.isArray(student?.internal_flags)
        ? student.internal_flags
        : [],
      active_resume_id: student?.active_resume_id || null,
      profile_completion_percentage:
        Number(student?.profile_completion_percentage || 0) || 0,
      internal_notes: internalNotesByStudentId.get(student.id) || [],
      resumes_meta: resumesByStudentId.get(student.id) || [],
    };
  });
}

const ALLOWED_CLOUD_DRIVE_PROFILE_STATUS = new Set([
  "",
  "Registered",
  "Not Cleared",
  "Cleared",
  "Practical Online Task Round Cleared",
  "Face-to-Face Round (Live Interview) Cleared",
  "Managerial Round Cleared",
  "Cleared AWS Drive",
  "Cleared DevOps Drive",
  "Practical Online Task Round Rejected",
  "Face-to-Face Round (Live Interview) Rejected",
  "Managerial Round Rejected",
  "Not Attended drive",
]);

const CLEARED_STATUSES = new Set([
  "PASSED",
  "Cleared",
  "CLEARED",
  "READY_FOR_INTERVIEWS",
  "Practical Online Task Round Cleared",
  "Face-to-Face Round (Live Interview) Cleared",
  "Managerial Round Cleared",
  "Cleared AWS Drive",
  "Cleared DevOps Drive",
]);

const JOB_SEARCH_STATUS_VALUES = new Set([
  "ACTIVE_NOW",
  "PASSIVE",
  "NOT_LOOKING",
  "UNRESPONSIVE",
]);

const INTERNAL_FLAG_VALUES = new Set(["RED_FLAG", "ON_HOLD", "BLACKLISTED"]);

const RESUME_APPROVAL_VALUES = new Set(["PENDING", "APPROVED", "REJECTED"]);

function normalizeJobSearchStatus(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "PASSIVE";
  if (!JOB_SEARCH_STATUS_VALUES.has(text)) {
    const err = new Error("Invalid job search status");
    err.status = 400;
    throw err;
  }
  return text;
}

function normalizeInternalFlags(values) {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);

  const unique = [...new Set(normalized)];
  unique.forEach((value) => {
    if (!INTERNAL_FLAG_VALUES.has(value)) {
      const err = new Error(`Invalid internal flag: ${value}`);
      err.status = 400;
      throw err;
    }
  });

  return unique;
}

function normalizeResumeApprovalStatus(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim().toUpperCase();
  if (!RESUME_APPROVAL_VALUES.has(text)) {
    const err = new Error("Invalid resume approval status");
    err.status = 400;
    throw err;
  }
  return text;
}

function normalizeResumeUpdatePayload(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => ({
      id: String(value?.id || "").trim(),
      approval_status: normalizeResumeApprovalStatus(value?.approval_status),
      rejection_reason:
        value?.rejection_reason === undefined
          ? null
          : String(value?.rejection_reason || "").trim() || null,
    }))
    .filter((value) => value.id && value.approval_status);
}

function normalizeDriveClearedStatusArray(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Set();
  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (normalized) unique.add(normalized);
  });
  return [...unique];
}

function normalizeCloudDriveStatusInput(status) {
  const text = String(status || "").trim();
  if (!ALLOWED_CLOUD_DRIVE_PROFILE_STATUS.has(text)) {
    const err = new Error("Invalid cloud drive status");
    err.status = 400;
    throw err;
  }
  return text || null;
}

function normalizeDriveClearedDateInput(value) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const err = new Error("driveClearedDate must be in YYYY-MM-DD format");
    err.status = 400;
    throw err;
  }
  return raw;
}

function normalizeCloudDriveHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const byDate = new Map();
  entries.forEach((entry) => {
    const statusRaw = String(entry?.status || "").trim();
    const dateRaw = String(entry?.date || "").trim();

    if (!statusRaw || !dateRaw) return;
    if (!ALLOWED_CLOUD_DRIVE_PROFILE_STATUS.has(statusRaw)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return;

    byDate.set(dateRaw, { status: statusRaw, date: dateRaw });
  });

  return [...byDate.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

function buildLegacyCloudDriveHistory(profile) {
  const status = String(profile?.cloud_drive_status || "").trim();
  const date = String(profile?.drive_cleared_date || "").trim();
  if (!status || !date) return [];
  return normalizeCloudDriveHistoryEntries([{ status, date }]);
}

function deriveDriveClearedStatusesFromHistory(history) {
  return normalizeDriveClearedStatusArray(
    (history || [])
      .map((item) => String(item?.status || "").trim())
      .filter((status) => CLEARED_STATUSES.has(status)),
  );
}

async function updateStudentCloudDriveProfileFields({
  studentId,
  cloudDriveStatus,
  driveClearedDate,
  cloudDriveHistory,
  jobSearchStatus,
  internalFlags,
  internalNote,
  internalNoteId,
  activeResumeId,
  activeResumeApprovalStatus,
  activeResumeRejectionReason,
  resumeUpdates,
  actorId,
}) {
  const normalizedStudentId = String(studentId || "").trim();
  if (!normalizedStudentId) {
    const err = new Error("studentId is required");
    err.status = 400;
    throw err;
  }

  const supabase = requireAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select(
      "id, role, cloud_drive_status, drive_cleared_date, drive_cleared_status, cloud_drive_status_history, job_search_status, internal_flags, active_resume_id",
    )
    .eq("id", normalizedStudentId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing || existing.role !== ROLES.STUDENT) {
    const err = new Error("Student not found");
    err.status = 404;
    throw err;
  }

  let nextHistory = normalizeCloudDriveHistoryEntries(
    existing.cloud_drive_status_history,
  );
  if (nextHistory.length === 0) {
    nextHistory = buildLegacyCloudDriveHistory(existing);
  }

  if (Array.isArray(cloudDriveHistory)) {
    nextHistory = normalizeCloudDriveHistoryEntries(cloudDriveHistory);
  } else {
    const nextStatus = normalizeCloudDriveStatusInput(cloudDriveStatus);
    const nextDate = normalizeDriveClearedDateInput(driveClearedDate);
    if (nextStatus && nextDate) {
      nextHistory = normalizeCloudDriveHistoryEntries([
        ...nextHistory,
        { status: nextStatus, date: nextDate },
      ]);
    }
  }

  const latest = nextHistory[0] || null;
  const nextDriveClearedStatus =
    deriveDriveClearedStatusesFromHistory(nextHistory);

  const nextJobSearchStatus = normalizeJobSearchStatus(
    jobSearchStatus ?? existing.job_search_status,
  );
  const nextInternalFlags =
    internalFlags === undefined
      ? Array.isArray(existing.internal_flags)
        ? existing.internal_flags
        : []
      : normalizeInternalFlags(internalFlags);

  const normalizedActiveResumeId =
    activeResumeId === undefined || activeResumeId === null || activeResumeId === ""
      ? null
      : String(activeResumeId).trim();
  let effectiveActiveResumeId =
    activeResumeId === undefined
      ? String(existing.active_resume_id || "").trim() || null
      : normalizedActiveResumeId;

  const resumeApprovalStatus = normalizeResumeApprovalStatus(
    activeResumeApprovalStatus,
  );
  const normalizedRejectionReason =
    activeResumeRejectionReason === undefined
      ? undefined
      : String(activeResumeRejectionReason || "").trim() || null;
  let normalizedResumeUpdates = normalizeResumeUpdatePayload(resumeUpdates);

  if (!effectiveActiveResumeId && resumeApprovalStatus) {
    const { data: latestResume, error: latestResumeError } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", normalizedStudentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestResumeError) throw latestResumeError;
    effectiveActiveResumeId = latestResume?.id || null;
  }

  if (
    normalizedResumeUpdates.length === 0 &&
    effectiveActiveResumeId &&
    resumeApprovalStatus
  ) {
    normalizedResumeUpdates = [
      {
        id: effectiveActiveResumeId,
        approval_status: resumeApprovalStatus,
        rejection_reason: normalizedRejectionReason,
      },
    ];
  }

  const { data: existingResumeRows, error: existingResumeRowsError } =
    await supabase
      .from("resumes")
      .select(
        "id, approval_status, rejection_reason, approved_at, approved_by",
      )
      .eq("user_id", normalizedStudentId);
  if (existingResumeRowsError) throw existingResumeRowsError;

  const existingResumeById = new Map(
    (existingResumeRows || []).map((row) => [String(row.id), row]),
  );

  if (effectiveActiveResumeId && !existingResumeById.has(effectiveActiveResumeId)) {
    const err = new Error("Active resume does not belong to this student");
    err.status = 400;
    throw err;
  }

  if (resumeApprovalStatus && !effectiveActiveResumeId) {
    const err = new Error(
      "Select an active resume before updating approval status",
    );
    err.status = 400;
    throw err;
  }

  const invalidResumeUpdate = normalizedResumeUpdates.find(
    (resume) => !existingResumeById.has(String(resume.id)),
  );
  if (invalidResumeUpdate) {
    const err = new Error("One or more resume updates do not belong to this student");
    err.status = 400;
    throw err;
  }

  const profilePatch = {
    cloud_drive_status: latest?.status || null,
    drive_cleared_date: latest?.date || null,
    drive_cleared_status: nextDriveClearedStatus,
    cloud_drive_status_history: nextHistory,
    job_search_status: nextJobSearchStatus,
    internal_flags: nextInternalFlags,
    active_resume_id:
      activeResumeId === undefined ? existing.active_resume_id : effectiveActiveResumeId,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("id", normalizedStudentId)
    .select(
      "id, full_name, email, phone, role, location, preferred_location, skills, experience_level, experience_years, is_eligible, eligible_until, updated_at, cloud_drive_status, drive_cleared_date, drive_cleared_status, cloud_drive_status_history, job_search_status, internal_flags, active_resume_id",
    )
    .single();

  if (updateError) throw updateError;

  for (const resumeUpdate of normalizedResumeUpdates) {
    const existingResume = existingResumeById.get(String(resumeUpdate.id));
    const desiredApprovalStatus =
      String(resumeUpdate.approval_status || "PENDING").trim().toUpperCase() ||
      "PENDING";
    const desiredRejectionReason =
      resumeUpdate.rejection_reason !== undefined
        ? resumeUpdate.rejection_reason
        : existingResume.rejection_reason ?? null;
    const currentApprovalStatus = String(
      existingResume?.approval_status || "PENDING",
    )
      .trim()
      .toUpperCase();
    const currentRejectionReason =
      String(existingResume?.rejection_reason || "").trim() || null;
    const statusChanged = desiredApprovalStatus !== currentApprovalStatus;
    const rejectionReasonChanged =
      desiredRejectionReason !== currentRejectionReason;

    if (!statusChanged && !rejectionReasonChanged) continue;

    const resumePatch = {
      approval_status: desiredApprovalStatus,
      rejection_reason: desiredRejectionReason,
    };

    if (statusChanged) {
      if (desiredApprovalStatus === "PENDING") {
        resumePatch.approved_by = null;
        resumePatch.approved_at = null;
      } else {
        resumePatch.approved_by = actorId || null;
        resumePatch.approved_at = new Date().toISOString();
      }
    }

    // eslint-disable-next-line no-await-in-loop
    const { error: resumeUpdateError } = await supabase
      .from("resumes")
      .update(resumePatch)
      .eq("id", resumeUpdate.id)
      .eq("user_id", normalizedStudentId);
    if (resumeUpdateError) throw resumeUpdateError;
  }

  const normalizedInternalNote = String(internalNote ?? "").trim();
  const normalizedInternalNoteId = String(internalNoteId || "").trim();

  if (normalizedInternalNoteId) {
    const { error: noteError } = await supabase
      .from("profile_internal_notes")
      .update({
        note: normalizedInternalNote,
        source: "MANUAL",
      })
      .eq("id", normalizedInternalNoteId)
      .eq("student_id", normalizedStudentId);
    if (noteError) throw noteError;
  } else if (normalizedInternalNote) {
    const { error: noteError } = await supabase
      .from("profile_internal_notes")
      .insert({
        student_id: normalizedStudentId,
        note: normalizedInternalNote,
        source: "MANUAL",
        created_by: actorId || null,
      });
    if (noteError) throw noteError;
  }

  const historyRows = [];
  if (
    JSON.stringify(existing.cloud_drive_status_history || []) !==
    JSON.stringify(nextHistory || [])
  ) {
    historyRows.push({
      student_id: normalizedStudentId,
      field_changed: "cloud_drive_status_history",
      old_value: existing.cloud_drive_status_history || [],
      new_value: nextHistory || [],
      changed_by: actorId || null,
      source: "ADMIN_UPDATE",
    });
  }

  if ((existing.job_search_status || "PASSIVE") !== nextJobSearchStatus) {
    historyRows.push({
      student_id: normalizedStudentId,
      field_changed: "job_search_status",
      old_value: { value: existing.job_search_status || "PASSIVE" },
      new_value: { value: nextJobSearchStatus },
      changed_by: actorId || null,
      source: "ADMIN_UPDATE",
    });
  }

  if (
    JSON.stringify(existing.internal_flags || []) !==
    JSON.stringify(nextInternalFlags || [])
  ) {
    historyRows.push({
      student_id: normalizedStudentId,
      field_changed: "internal_flags",
      old_value: existing.internal_flags || [],
      new_value: nextInternalFlags || [],
      changed_by: actorId || null,
      source: "ADMIN_UPDATE",
    });
  }

  if ((existing.active_resume_id || null) !== (updated.active_resume_id || null)) {
    historyRows.push({
      student_id: normalizedStudentId,
      field_changed: "active_resume_id",
      old_value: { value: existing.active_resume_id || null },
      new_value: { value: updated.active_resume_id || null },
      changed_by: actorId || null,
      source: "ADMIN_UPDATE",
    });
  }

  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from("profile_status_history")
      .insert(historyRows);
    if (historyError) throw historyError;
  }

  const [notesRes, resumeRows] = await Promise.all([
    supabase
      .from("profile_internal_notes")
      .select("id, note, source, created_at, created_by")
      .eq("student_id", normalizedStudentId)
      .order("created_at", { ascending: false })
      .limit(20),
    fetchResumeMetaByStudentId({
      supabase,
      studentId: normalizedStudentId,
    }),
  ]);

  if (notesRes.error) throw notesRes.error;

  updated.internal_notes = notesRes.data || [];
  updated.resumes_meta = resumeRows || [];
  return updated;
}

function normalizeUuidList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function normalizePlaylistName(value) {
  return String(value || "").trim();
}

async function resolveFavoriteOwnerId({ requesterId, requesterRole }) {
  const normalizedRequesterId = String(requesterId || "").trim();
  if (!normalizedRequesterId) {
    const err = new Error("Unauthenticated");
    err.status = 401;
    throw err;
  }

  if (requesterRole === ROLES.SUPER_ADMIN) {
    return normalizedRequesterId;
  }

  if (requesterRole !== ROLES.ADMIN) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", ROLES.SUPER_ADMIN)
    .order("updated_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const superadminId = data?.[0]?.id;
  if (!superadminId) {
    const err = new Error("No super admin found to map favourite students");
    err.status = 400;
    throw err;
  }

  return superadminId;
}

async function listFavoriteStudentIds({ superadminId }) {
  const supabase = requireAdminClient();

  const { data, error } = await supabase
    .from("superadmin_favorite_students")
    .select("student_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const unique = new Set();
  (data || []).forEach((row) => {
    const studentId = String(row?.student_id || "").trim();
    if (studentId) unique.add(studentId);
  });
  return [...unique];
}

async function addFavoriteStudents({ superadminId, studentIds }) {
  const supabase = requireAdminClient();
  const normalizedIds = normalizeUuidList(studentIds);

  if (normalizedIds.length === 0) {
    const err = new Error("studentIds is required");
    err.status = 400;
    throw err;
  }

  const rows = normalizedIds.map((studentId) => ({
    superadmin_id: superadminId,
    student_id: studentId,
  }));

  const { error } = await supabase
    .from("superadmin_favorite_students")
    .upsert(rows, {
      onConflict: "superadmin_id,student_id",
      ignoreDuplicates: true,
    });

  if (error) throw error;

  return listFavoriteStudentIds({ superadminId });
}

async function removeFavoriteStudents({ superadminId, studentIds }) {
  const supabase = requireAdminClient();
  const normalizedIds = normalizeUuidList(studentIds);

  if (normalizedIds.length === 0) {
    const err = new Error("studentIds is required");
    err.status = 400;
    throw err;
  }

  const { error } = await supabase
    .from("superadmin_favorite_students")
    .delete()
    .in("student_id", normalizedIds);

  if (error) throw error;

  return listFavoriteStudentIds({ superadminId });
}

async function ensurePlaylistExists({ supabase, playlistId }) {
  const normalizedPlaylistId = Number(playlistId);

  if (!Number.isInteger(normalizedPlaylistId) || normalizedPlaylistId <= 0) {
    const err = new Error("Valid playlistId is required");
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from("superadmin_favorite_playlists")
    .select("id, name, created_at")
    .eq("id", normalizedPlaylistId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    const err = new Error("Playlist not found");
    err.status = 404;
    throw err;
  }

  return data;
}

async function listFavoritePlaylists() {
  const supabase = requireAdminClient();

  const { data: playlists, error: playlistError } = await supabase
    .from("superadmin_favorite_playlists")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (playlistError) throw playlistError;

  const playlistIds = (playlists || []).map((playlist) => playlist.id);
  if (!playlistIds.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("superadmin_favorite_playlist_students")
    .select("playlist_id, student_id, created_at")
    .in("playlist_id", playlistIds)
    .order("created_at", { ascending: true });

  if (itemError) throw itemError;

  const byPlaylist = new Map();
  (items || []).forEach((item) => {
    const playlistId = item?.playlist_id;
    const studentId = String(item?.student_id || "").trim();
    if (!playlistId || !studentId) return;
    if (!byPlaylist.has(playlistId)) byPlaylist.set(playlistId, []);
    byPlaylist.get(playlistId).push(studentId);
  });

  return (playlists || []).map((playlist) => {
    const studentIds = byPlaylist.get(playlist.id) || [];
    return {
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.created_at,
      studentIds,
      studentCount: studentIds.length,
    };
  });
}

async function createFavoritePlaylist({ superadminId, name, studentIds }) {
  const supabase = requireAdminClient();
  const normalizedSuperadminId = String(superadminId || "").trim();
  const normalizedName = normalizePlaylistName(name);
  const normalizedStudentIds = [...new Set(normalizeUuidList(studentIds))];

  if (!normalizedSuperadminId) {
    const err = new Error("superadminId is required");
    err.status = 400;
    throw err;
  }

  if (!normalizedName) {
    const err = new Error("Playlist name is required");
    err.status = 400;
    throw err;
  }

  if (normalizedStudentIds.length === 0) {
    const err = new Error("Select at least one student to create playlist");
    err.status = 400;
    throw err;
  }

  const { data: playlist, error: insertError } = await supabase
    .from("superadmin_favorite_playlists")
    .insert({
      superadmin_id: normalizedSuperadminId,
      name: normalizedName,
    })
    .select("id, name, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const err = new Error("Playlist name already exists");
      err.status = 409;
      throw err;
    }
    throw insertError;
  }

  const rows = normalizedStudentIds.map((studentId) => ({
    playlist_id: playlist.id,
    student_id: studentId,
  }));

  const { error: itemError } = await supabase
    .from("superadmin_favorite_playlist_students")
    .insert(rows);

  if (itemError) throw itemError;

  return {
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.created_at,
    studentIds: normalizedStudentIds,
    studentCount: normalizedStudentIds.length,
  };
}

async function addStudentsToFavoritePlaylist({ playlistId, studentIds }) {
  const supabase = requireAdminClient();
  const normalizedStudentIds = [...new Set(normalizeUuidList(studentIds))];

  if (!normalizedStudentIds.length) {
    const err = new Error("studentIds is required");
    err.status = 400;
    throw err;
  }

  const playlist = await ensurePlaylistExists({ supabase, playlistId });

  const rows = normalizedStudentIds.map((studentId) => ({
    playlist_id: playlist.id,
    student_id: studentId,
  }));

  const { error } = await supabase
    .from("superadmin_favorite_playlist_students")
    .upsert(rows, {
      onConflict: "playlist_id,student_id",
      ignoreDuplicates: true,
    });

  if (error) throw error;

  const { data: items, error: itemError } = await supabase
    .from("superadmin_favorite_playlist_students")
    .select("student_id")
    .eq("playlist_id", playlist.id)
    .order("created_at", { ascending: true });

  if (itemError) throw itemError;

  const nextStudentIds = (items || [])
    .map((item) => String(item?.student_id || "").trim())
    .filter(Boolean);

  return {
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.created_at,
    studentIds: nextStudentIds,
    studentCount: nextStudentIds.length,
  };
}

async function removeStudentsFromFavoritePlaylist({ playlistId, studentIds }) {
  const supabase = requireAdminClient();
  const normalizedStudentIds = [...new Set(normalizeUuidList(studentIds))];

  if (!normalizedStudentIds.length) {
    const err = new Error("studentIds is required");
    err.status = 400;
    throw err;
  }

  const playlist = await ensurePlaylistExists({ supabase, playlistId });

  const { error } = await supabase
    .from("superadmin_favorite_playlist_students")
    .delete()
    .eq("playlist_id", playlist.id)
    .in("student_id", normalizedStudentIds);

  if (error) throw error;

  const { data: items, error: itemError } = await supabase
    .from("superadmin_favorite_playlist_students")
    .select("student_id")
    .eq("playlist_id", playlist.id)
    .order("created_at", { ascending: true });

  if (itemError) throw itemError;

  const nextStudentIds = (items || [])
    .map((item) => String(item?.student_id || "").trim())
    .filter(Boolean);

  return {
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.created_at,
    studentIds: nextStudentIds,
    studentCount: nextStudentIds.length,
  };
}

async function deleteFavoritePlaylist({ playlistId }) {
  const supabase = requireAdminClient();
  const playlist = await ensurePlaylistExists({ supabase, playlistId });

  const { error } = await supabase
    .from("superadmin_favorite_playlists")
    .delete()
    .eq("id", playlist.id);

  if (error) throw error;

  return {
    id: playlist.id,
    name: playlist.name,
  };
}

function startOfUtcDay(inputDate = new Date()) {
  return new Date(
    Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth(),
      inputDate.getUTCDate(),
    ),
  );
}

function toDayKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildDayKeys(days, endDate = new Date()) {
  const keys = [];
  const start = startOfUtcDay(endDate);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  for (let offset = 0; offset < days; offset += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(start.getUTCDate() + offset);
    keys.push(toDayKey(cursor.toISOString()));
  }

  return keys;
}

function toShortLabel(dayKey) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function normalizeDateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return raw;
}

function buildDayKeysFromRange(fromKey, toKey) {
  const keys = [];
  const fromDate = new Date(`${fromKey}T00:00:00.000Z`);
  const toDate = new Date(`${toKey}T00:00:00.000Z`);
  const totalDays =
    Math.floor(
      (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;

  for (let offset = 0; offset < totalDays; offset += 1) {
    const cursor = new Date(fromDate);
    cursor.setUTCDate(fromDate.getUTCDate() + offset);
    keys.push(toDayKey(cursor.toISOString()));
  }

  return keys;
}

function buildDayKeysFromRows(rowGroups, fallbackDate = new Date()) {
  let minKey = null;
  let maxKey = null;

  for (const rows of rowGroups) {
    for (const row of rows || []) {
      const key = toDayKey(row?.created_at);
      if (!key) continue;
      if (!minKey || key < minKey) minKey = key;
      if (!maxKey || key > maxKey) maxKey = key;
    }
  }

  if (!minKey || !maxKey) {
    const key = toDayKey(startOfUtcDay(fallbackDate).toISOString());
    return [key];
  }

  return buildDayKeysFromRange(minKey, maxKey);
}

function parseAnalyticsDateRange({ from, to } = {}) {
  const fromKey = normalizeDateOnly(from);
  const toKey = normalizeDateOnly(to);

  if (!fromKey && !toKey) {
    return {
      isFiltered: false,
      fromKey: null,
      toKey: null,
      fromIso: null,
      toExclusiveIso: null,
    };
  }

  if (!fromKey || !toKey) {
    const err = new Error("Both from and to dates are required for filtering");
    err.status = 400;
    throw err;
  }

  if (fromKey > toKey) {
    const err = new Error("From date cannot be greater than To date");
    err.status = 400;
    throw err;
  }

  const fromIso = `${fromKey}T00:00:00.000Z`;
  const toStart = new Date(`${toKey}T00:00:00.000Z`);
  const toExclusive = new Date(toStart);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return {
    isFiltered: true,
    fromKey,
    toKey,
    fromIso,
    toExclusiveIso: toExclusive.toISOString(),
  };
}

function applyCreatedAtRange(query, range, column = "created_at") {
  if (!range?.isFiltered) return query;
  return query.gte(column, range.fromIso).lt(column, range.toExclusiveIso);
}

function buildDayWindowFromKey(dayKey) {
  const fromIso = `${dayKey}T00:00:00.000Z`;
  const toDate = new Date(fromIso);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  return {
    fromIso,
    toExclusiveIso: toDate.toISOString(),
  };
}

function resolveDauTargetDayKey(dateRange, now = new Date()) {
  if (dateRange?.isFiltered && dateRange.toKey) return dateRange.toKey;
  return toDayKey(startOfUtcDay(now).toISOString());
}

async function safeSelectColumnValues({
  supabase,
  table,
  column,
  fromIso,
  toExclusiveIso,
  timestampColumn = "created_at",
}) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .gte(timestampColumn, fromIso)
    .lt(timestampColumn, toExclusiveIso);

  if (error) {
    // Ignore missing-table errors for optional sources in approximate DAU.
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data || []).map((row) => row?.[column]).filter(Boolean);
}

async function getQuickApproximateDau({ supabase, targetDayKey }) {
  const dayWindow = buildDayWindowFromKey(targetDayKey);

  const [profileUpdates, applications, jobs, externalJobs, resumes] =
    await Promise.all([
      safeSelectColumnValues({
        supabase,
        table: "profiles",
        column: "id",
        fromIso: dayWindow.fromIso,
        toExclusiveIso: dayWindow.toExclusiveIso,
        timestampColumn: "updated_at",
      }),
      safeSelectColumnValues({
        supabase,
        table: "applications",
        column: "student_id",
        fromIso: dayWindow.fromIso,
        toExclusiveIso: dayWindow.toExclusiveIso,
      }),
      safeSelectColumnValues({
        supabase,
        table: "jobs",
        column: "posted_by",
        fromIso: dayWindow.fromIso,
        toExclusiveIso: dayWindow.toExclusiveIso,
      }),
      safeSelectColumnValues({
        supabase,
        table: "external_jobs",
        column: "posted_by",
        fromIso: dayWindow.fromIso,
        toExclusiveIso: dayWindow.toExclusiveIso,
      }),
      safeSelectColumnValues({
        supabase,
        table: "resumes",
        column: "user_id",
        fromIso: dayWindow.fromIso,
        toExclusiveIso: dayWindow.toExclusiveIso,
      }),
    ]);

  return new Set([
    ...profileUpdates,
    ...applications,
    ...jobs,
    ...externalJobs,
    ...resumes,
  ]).size;
}

async function getAccurateDau({ supabase, targetDayKey }) {
  const { count, error } = await supabase
    .from("user_daily_activity")
    .select("user_id", { count: "exact", head: true })
    .eq("activity_date", targetDayKey);

  if (error) {
    // Table may not exist until migration is applied.
    if (error.code === "42P01") {
      return { count: null, available: false };
    }
    throw error;
  }

  return {
    count: count || 0,
    available: true,
  };
}

function normalizeSkillTokens(rawSkills) {
  if (!rawSkills) return [];

  if (Array.isArray(rawSkills)) {
    return rawSkills
      .map((item) =>
        String(item || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
  }

  return String(rawSkills)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function fetchProfilesTimeline(supabase, range) {
  const baseSelect = "id, role, is_eligible, application_quota, updated_at";

  let primaryQuery = supabase
    .from("profiles")
    .select(`${baseSelect}, created_at`);
  primaryQuery = applyCreatedAtRange(primaryQuery, range, "created_at");
  const primary = await primaryQuery;

  if (!primary.error) {
    return {
      rows: primary.data || [],
      timestampField: "created_at",
    };
  }

  let fallbackQuery = supabase.from("profiles").select(baseSelect);
  if (range?.isFiltered) {
    fallbackQuery = fallbackQuery
      .gte("updated_at", range.fromIso)
      .lt("updated_at", range.toExclusiveIso);
  }
  const fallback = await fallbackQuery;
  if (fallback.error) throw fallback.error;

  return {
    rows: fallback.data || [],
    timestampField: "updated_at",
  };
}

function countRowsByDay(dayKeys, rows, timestampField) {
  const countByDay = dayKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  for (const row of rows || []) {
    const key = toDayKey(row?.[timestampField]);
    if (key && countByDay[key] !== undefined) {
      countByDay[key] += 1;
    }
  }

  return countByDay;
}

function buildStatusBreakdown(statusRows) {
  const statusBreakdown = {
    Applied: 0,
    Shortlisted: 0,
    Interview: 0,
    Selected: 0,
    Rejected: 0,
  };

  const statusAliasToBucket = {
    applied: "Applied",
    "mapped to client": "Shortlisted",
    "screening call received": "Shortlisted",
    "interview scheduled": "Interview",
    "technical round": "Interview",
    "final round": "Interview",
    placed: "Selected",
    "resume not matched": "Rejected",
    "screening discolified": "Rejected",
    "interview not cleared": "Rejected",
    "job on hold": "Rejected",
    "position closed": "Rejected",
  };

  for (const row of statusRows || []) {
    const normalized = String(row?.status || "")
      .trim()
      .toLowerCase();
    const bucket = statusAliasToBucket[normalized] || "Applied";
    statusBreakdown[bucket] += 1;
  }

  return statusBreakdown;
}

function buildTopDemandedSkills(topSkillsRows) {
  const skillCounter = new Map();
  for (const row of topSkillsRows || []) {
    for (const skill of normalizeSkillTokens(row?.skills)) {
      skillCounter.set(skill, (skillCounter.get(skill) || 0) + 1);
    }
  }

  return [...skillCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));
}

function buildRecentActivities({
  profileRows,
  profileTimestampField,
  recentJobs,
  recentApplications,
}) {
  const recentActivities = [];

  for (const profile of profileRows || []) {
    const createdAt = profile?.[profileTimestampField] || null;
    if (!createdAt) continue;

    recentActivities.push({
      type: "new_user",
      createdAt,
      title: "New user registered",
      description: `${profile.role || "USER"} joined the platform`,
    });
  }

  for (const job of recentJobs || []) {
    recentActivities.push({
      type: "new_job",
      createdAt: job.created_at,
      title: "New job posted",
      description: `${job.title || "Untitled Role"} at ${job.company || "Unknown Company"}`,
    });
  }

  for (const application of recentApplications || []) {
    recentActivities.push({
      type: "new_application",
      createdAt: application.created_at,
      title: "New application submitted",
      description: `Application #${application.id}`,
    });

    const createdTime = new Date(application.created_at || 0).getTime();
    const updatedTime = new Date(application.updated_at || 0).getTime();
    if (
      Number.isFinite(createdTime) &&
      Number.isFinite(updatedTime) &&
      updatedTime > createdTime
    ) {
      recentActivities.push({
        type: "status_update",
        createdAt: application.updated_at,
        title: "Application status updated",
        description: `Application #${application.id} moved to ${application.status || "Updated"}`,
      });
    }
  }

  return recentActivities
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
}

async function analytics({ from, to } = {}) {
  const supabase = requireAdminClient();
  const dateRange = parseAnalyticsDateRange({ from, to });

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const tomorrowStartIso = new Date(
    todayStart.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const weekAhead = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    totalUsersRes,
    totalStudentsRes,
    totalAdminsRes,
    totalJobsRes,
    activeJobsRes,
    totalApplicationsRes,
    applicationsTodayRes,
    eligibleStudentsRes,
    studentsWithQuotaRes,
    jobsTimelineRes,
    applicationsTimelineRes,
    jobsExpiringSoonRes,
    topSkillsRowsRes,
    applicationsStatusRowsRes,
    recentJobsRes,
    recentApplicationsRes,
    profileTimeline,
  ] = await Promise.all([
    applyCreatedAtRange(
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", ROLES.STUDENT),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", ROLES.ADMIN),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true }),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", tomorrowStartIso),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", ROLES.STUDENT)
        .eq("is_eligible", true),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", ROLES.STUDENT)
        .gt("application_quota", 0),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase.from("jobs").select("created_at"),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase.from("applications").select("created_at"),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("jobs")
        .select("id, title, company, valid_till")
        .eq("status", "active")
        .gte("valid_till", now.toISOString())
        .lte("valid_till", weekAhead)
        .order("valid_till", { ascending: true })
        .limit(5),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("jobs")
        .select("skills")
        .order("created_at", { ascending: false })
        .limit(300),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase.from("applications").select("status"),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("jobs")
        .select("id, title, company, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      dateRange,
      "created_at",
    ),
    applyCreatedAtRange(
      supabase
        .from("applications")
        .select("id, status, created_at, updated_at, student_id, job_id")
        .order("updated_at", { ascending: false })
        .limit(12),
      dateRange,
      "created_at",
    ),
    fetchProfilesTimeline(supabase, dateRange),
  ]);

  const totalUsers = totalUsersRes.count || 0;
  const totalStudents = totalStudentsRes.count || 0;
  const totalAdmins = totalAdminsRes.count || 0;
  const totalJobs = totalJobsRes.count || 0;
  const activeJobs = activeJobsRes.count || 0;
  const totalApplications = totalApplicationsRes.count || 0;
  const applicationsToday = applicationsTodayRes.count || 0;
  const eligibleStudents = eligibleStudentsRes.count || 0;
  const nonEligibleStudents = Math.max(totalStudents - eligibleStudents, 0);
  const studentsWithRemainingQuota = studentsWithQuotaRes.count || 0;

  const dayKeys = dateRange.isFiltered
    ? buildDayKeysFromRange(dateRange.fromKey, dateRange.toKey)
    : buildDayKeysFromRows(
        [
          profileTimeline.rows,
          jobsTimelineRes.data,
          applicationsTimelineRes.data,
        ],
        now,
      );

  const usersGrowthCountByDay = countRowsByDay(
    dayKeys,
    profileTimeline.rows,
    profileTimeline.timestampField,
  );

  const newUsersToday =
    usersGrowthCountByDay[toDayKey(todayStart.toISOString())] || 0;

  const jobsCountByDay = countRowsByDay(
    dayKeys,
    jobsTimelineRes.data,
    "created_at",
  );

  const applicationsCountByDay = countRowsByDay(
    dayKeys,
    applicationsTimelineRes.data,
    "created_at",
  );

  const usersGrowth = dayKeys.map((key) => ({
    date: key,
    label: toShortLabel(key),
    users: usersGrowthCountByDay[key] || 0,
  }));

  const jobsPerDay = dayKeys.map((key) => ({
    date: key,
    label: toShortLabel(key),
    jobs: jobsCountByDay[key] || 0,
  }));

  const applicationsPerDay = dayKeys.map((key) => ({
    date: key,
    label: toShortLabel(key),
    applications: applicationsCountByDay[key] || 0,
  }));

  const statusBreakdown = buildStatusBreakdown(applicationsStatusRowsRes.data);

  const topDemandedSkills = buildTopDemandedSkills(topSkillsRowsRes.data);

  const jobsExpiringSoon = (jobsExpiringSoonRes.data || []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    validTill: job.valid_till,
  }));

  const sortedRecentActivities = buildRecentActivities({
    profileRows: profileTimeline.rows,
    profileTimestampField: profileTimeline.timestampField,
    recentJobs: recentJobsRes.data,
    recentApplications: recentApplicationsRes.data,
  });

  const dauDate = resolveDauTargetDayKey(dateRange, now);
  const [quickApproximateDau, accurateDauResult] = await Promise.all([
    getQuickApproximateDau({ supabase, targetDayKey: dauDate }),
    getAccurateDau({ supabase, targetDayKey: dauDate }),
  ]);

  return {
    totalUsers,
    totalStudents,
    totalAdmins,
    totalJobs,
    activeJobs,
    totalApplications,
    newUsersToday,
    applicationsToday,
    statusBreakdown,
    jobsPerDay,
    applicationsPerDay,
    usersGrowth,
    quickApproximateDau,
    accurateDau: accurateDauResult.count,
    accurateDauAvailable: accurateDauResult.available,
    dauDate,
    recentActivities: sortedRecentActivities,
    selectedRange: {
      from: dateRange.fromKey,
      to: dateRange.toKey,
      isFiltered: dateRange.isFiltered,
    },
    eligibleVsNonEligible: {
      eligible: eligibleStudents,
      nonEligible: nonEligibleStudents,
    },
    studentsWithRemainingQuota,
    topDemandedSkills,
    jobsExpiringSoon,
  };
}

function normalizePhoneForSearch(value) {
  return String(value || "")
    .replaceAll(/\D/g, "")
    .trim();
}

async function findStudentWithApplications({ type, query }) {
  const supabase = requireAdminClient();
  const normalizedType = String(type || "")
    .trim()
    .toLowerCase();
  const normalizedQuery = String(query || "").trim();

  if (!["email", "phone"].includes(normalizedType)) {
    const err = new Error("Type must be either email or phone");
    err.status = 400;
    throw err;
  }

  if (!normalizedQuery) {
    const err = new Error("Search value is required");
    err.status = 400;
    throw err;
  }

  let profileQuery = supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, location, is_eligible, eligible_until, updated_at, resume_url",
    )
    .eq("role", ROLES.STUDENT)
    .limit(1);

  if (normalizedType === "email") {
    profileQuery = profileQuery.eq("email", normalizeEmail(normalizedQuery));
  } else {
    const phoneDigits = normalizePhoneForSearch(normalizedQuery);
    if (!phoneDigits) {
      const err = new Error("Valid phone number is required");
      err.status = 400;
      throw err;
    }
    profileQuery = profileQuery.ilike("phone", `%${phoneDigits}%`);
  }

  const { data: student, error: studentError } =
    await profileQuery.maybeSingle();
  if (studentError) throw studentError;

  if (!student?.id) {
    return { student: null, applications: [] };
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select(
      `
        id,
        status,
        created_at,
        updated_at,
        selected_resume_url,
        job_id,
        jobs:job_id(
          id,
          title,
          company,
          ctc,
          skills,
          location,
          status
        )
      `,
    )
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  if (applicationsError) throw applicationsError;

  return {
    student,
    applications: (applications || []).map((item) => ({
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      selected_resume_url: item.selected_resume_url,
      job: item.jobs
        ? {
            id: item.jobs.id,
            title: item.jobs.title,
            company: item.jobs.company,
            ctc: item.jobs.ctc,
            skills: item.jobs.skills,
            location: item.jobs.location,
            status: item.jobs.status,
          }
        : null,
    })),
  };
}

module.exports = {
  promoteByEmail,
  listProfiles,
  listStudentsWithLatestApplication,
  updateStudentCloudDriveProfileFields,
  resolveFavoriteOwnerId,
  listFavoriteStudentIds,
  addFavoriteStudents,
  removeFavoriteStudents,
  listFavoritePlaylists,
  createFavoritePlaylist,
  addStudentsToFavoritePlaylist,
  removeStudentsFromFavoritePlaylist,
  deleteFavoritePlaylist,
  analytics,
  findStudentWithApplications,
};
