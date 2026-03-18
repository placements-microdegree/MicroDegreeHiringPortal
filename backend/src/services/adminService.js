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

async function analytics() {
  const supabase = requireAdminClient();

  const [jobs, applications, students, eligible, admins] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", ROLES.STUDENT),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_eligible", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", ROLES.ADMIN),
  ]);

  const jobCount = jobs.count || 0;
  const appCount = applications.count || 0;
  const studentCount = students.count || 0;
  const eligibleCount = eligible.count || 0;
  const adminCount = admins.count || 0;

  return { jobCount, appCount, studentCount, eligibleCount, adminCount };
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
