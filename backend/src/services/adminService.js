const { getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");

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
        "id, full_name, email, phone, role, location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url, current_ctc, expected_ctc, total_experience",
      )
      .eq("role", ROLES.STUDENT)
      .order("updated_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, role, location, skills, experience_level, experience_years, profile_photo_url, is_eligible, eligible_until, updated_at, resume_url",
        )
        .eq("role", ROLES.STUDENT)
        .order("updated_at", { ascending: false });

      if (fallbackError) throw fallbackError;
      students = fallbackData || [];
    } else {
      students = data || [];
    }
  }

  if (!Array.isArray(students) || students.length === 0) return [];

  const studentIds = students.map((student) => student?.id).filter(Boolean);

  if (studentIds.length === 0) return students;

  // Some DB deployments do not have current_ctc / expected_ctc / total_experience on applications.
  // Try the rich select first, then gracefully fall back to schema-safe columns.
  let applications = [];
  {
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, student_id, current_ctc, expected_ctc, total_experience, relevant_experience, selected_resume_url, created_at, updated_at",
      )
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("applications")
        .select(
          "id, student_id, relevant_experience, selected_resume_url, created_at, updated_at",
        )
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .order("updated_at", { ascending: false });

      if (fallbackError) throw fallbackError;
      applications = fallbackData || [];
    } else {
      applications = data || [];
    }
  }

  const latestByStudentId = new Map();
  (applications || []).forEach((application) => {
    const studentId = application?.student_id;
    if (!studentId || latestByStudentId.has(studentId)) return;
    latestByStudentId.set(studentId, application);
  });

  return students.map((student) => {
    const latest = latestByStudentId.get(student.id) || null;

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
        latest?.selected_resume_url ?? student?.resume_url ?? null,
      recent_application_created_at: latest?.created_at ?? null,
    };
  });
}

function normalizeUuidList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

async function listFavoriteStudentIds({ superadminId }) {
  const supabase = requireAdminClient();

  const { data, error } = await supabase
    .from("superadmin_favorite_students")
    .select("student_id")
    .eq("superadmin_id", superadminId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => row.student_id).filter(Boolean);
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
    .eq("superadmin_id", superadminId)
    .in("student_id", normalizedIds);

  if (error) throw error;

  return listFavoriteStudentIds({ superadminId });
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
  listFavoriteStudentIds,
  addFavoriteStudents,
  removeFavoriteStudents,
  analytics,
  findStudentWithApplications,
};
