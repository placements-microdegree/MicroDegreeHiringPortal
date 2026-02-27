const crypto = require("node:crypto");
const {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
} = require("../config/supabaseClient");
const { getSupabaseAdmin } = require("../config/db");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { ROLES } = require("../utils/constants");
const { normalizePhone } = require("../utils/phone");

function base64Url(buffer) {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest();
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const isHttpsDeployment = (process.env.BACKEND_ORIGIN || "").startsWith(
    "https://",
  );
  const shouldUseSecureCookies = isProd || isHttpsDeployment;
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies,
    sameSite: shouldUseSecureCookies ? "none" : "lax",
    path: "/",
    maxAge: 10 * 60 * 1000,
  };
}

function devLog(...args) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getAdminClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;
  // Fallback to non-cached constructor to give a clearer error.
  return getSupabaseAdminClient();
}

async function listUsersPage(adminApi, page, perPage) {
  let result;
  try {
    result = await adminApi.listUsers({ page, perPage });
  } catch {
    result = await adminApi.listUsers(page, perPage);
  }

  return {
    users: result?.data?.users || [],
    error: result?.error || null,
  };
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

async function ensureProfileRow({ user, role, fullName, phone, email }) {
  const supabase = getAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingError) throw existingError;

  const normalizedPhone =
    normalizePhone(
      phone ||
        user.user_metadata?.phone ||
        user.app_metadata?.phone ||
        user.user_metadata?.phone_number,
    ) || undefined;

  const toSave = {
    id: user.id,
    email:
      String(email || user.email || "")
        .trim()
        .toLowerCase() || null,
    full_name: fullName || user.user_metadata?.full_name || user.email,
    role,
    updated_at: new Date().toISOString(),
  };
  if (normalizedPhone) toSave.phone = normalizedPhone;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(toSave, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return { profile: data, isNew: !existing };
}

async function enforceStudentEligibility({ user }) {
  const supabase = getAdminClient();
  const email = user.email?.toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  let profileCreatedAt = null;
  let profileCourseFee = null;
  let phone = normalizePhone(
    user.user_metadata?.phone ||
      user.app_metadata?.phone ||
      user.user_metadata?.phone_number,
  );

  if (!phone) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("phone, created_at, course_fee")
      .eq("id", user.id)
      .maybeSingle();
    phone = normalizePhone(profileRow?.phone) || phone;
    profileCreatedAt = profileRow?.created_at || null;
    const parsedProfileFee = Number(profileRow?.course_fee);
    profileCourseFee = Number.isFinite(parsedProfileFee)
      ? parsedProfileFee
      : null;
  } else {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("created_at, course_fee")
      .eq("id", user.id)
      .maybeSingle();
    profileCreatedAt = profileRow?.created_at || null;
    const parsedProfileFee = Number(profileRow?.course_fee);
    profileCourseFee = Number.isFinite(parsedProfileFee)
      ? parsedProfileFee
      : null;
  }

  const markIneligible = async (message, courseFee = null) => {
    const { error: updateError } = await supabase.from("profiles").upsert({
      id: user.id,
      email,
      phone: phone || null,
      role: ROLES.STUDENT,
      course_fee: Number.isFinite(Number(courseFee)) ? Number(courseFee) : null,
      is_eligible: false,
      eligible_until: null,
      application_quota: 3,
      updated_at: new Date().toISOString(),
    });
    if (updateError) throw updateError;
    return { ok: false, message };
  };

  let enrolledByPhone = null;
  let enrolledByEmail = null;

  if (phone) {
    const { data, error } = await supabase
      .from("students_enrolled_all")
      .select("*")
      .ilike("phone", `%${phone.slice(-10)}%`)
      .limit(50);
    if (error) throw error;
    const phoneRows = Array.isArray(data) ? data : [];
    const lastTen = phone.slice(-10);
    enrolledByPhone =
      phoneRows.find((row) => normalizePhone(row?.phone) === phone) ||
      phoneRows.find((row) => {
        const rowPhone = normalizePhone(row?.phone);
        return rowPhone.length >= 10 && rowPhone.slice(-10) === lastTen;
      }) ||
      null;
  }

  if (normalizedEmail) {
    const { data, error } = await supabase
      .from("students_enrolled_all")
      .select("*")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    enrolledByEmail = data;
  }

  const enrolled = enrolledByEmail || enrolledByPhone;
  const matchedCourseFee = Number(enrolled?.course_fee);
  const effectiveCourseFee = Number.isFinite(matchedCourseFee)
    ? matchedCourseFee
    : profileCourseFee;

  if (!Number.isFinite(effectiveCourseFee)) {
    return markIneligible("Not enrolled");
  }

  if (effectiveCourseFee < 7000) {
    return markIneligible("Not eligible for placements", effectiveCourseFee);
  }

  const baseDate = profileCreatedAt ? new Date(profileCreatedAt) : new Date();
  const expiry = new Date(baseDate);
  expiry.setFullYear(expiry.getFullYear() + 2);

  if (Number.isNaN(expiry.getTime())) {
    return markIneligible("Invalid eligibility window", effectiveCourseFee);
  }
  if (new Date() > expiry) {
    return markIneligible("Eligibility expired", effectiveCourseFee);
  }

  const { error: updateError } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    phone: phone || null,
    role: ROLES.STUDENT,
    course_fee: effectiveCourseFee,
    is_eligible: true,
    eligible_until: expiry.toISOString(),
    application_quota: 3,
    updated_at: new Date().toISOString(),
  });
  if (updateError) throw updateError;

  return { ok: true, eligibleUntil: expiry.toISOString() };
}

async function me(req, res) {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const supabase = getSupabaseAnonClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("email not confirmed")) {
        const adminClient = getAdminClient();
        const existingUser = await findUserByEmail(adminClient, email);
        if (!existingUser?.id) {
          return res.status(403).json({
            success: false,
            message:
              "Email verification is pending for this account. Please contact support.",
          });
        }

        const { error: confirmError } =
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
          });
        if (confirmError) throw confirmError;

        const retried = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        data = retried.data;
        error = retried.error;
        if (error) {
          return res
            .status(401)
            .json({ success: false, message: error.message });
        }
      } else {
        return res.status(401).json({ success: false, message: error.message });
      }
    }

    if (data.session) {
      setAuthCookies(res, data.session);
    }

    const role =
      data.user?.user_metadata?.role ||
      data.user?.app_metadata?.role ||
      ROLES.STUDENT;

    await ensureProfileRow({ user: data.user, role });

    if (role === ROLES.STUDENT) {
      const eligibility = await enforceStudentEligibility({ user: data.user });
      if (!eligibility.ok) {
        devLog("[login] student eligibility", {
          userId: data.user.id,
          ok: false,
          reason: eligibility.message,
        });
      }
    }

    return res.json({
      success: true,
      user: { id: data.user.id, email: data.user.email, role },
    });
  } catch (err) {
    next(err);
  }
}

async function signup(req, res, next) {
  try {
    const { fullName, email, password, phone, role } = req.body || {};
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }
    const adminClient = getAdminClient();

    const [emailLookup, phoneLookup] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle(),
      normalizedPhone
        ? adminClient
            .from("profiles")
            .select("id")
            .eq("phone", normalizedPhone)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (emailLookup.error) throw emailLookup.error;
    if (phoneLookup.error) throw phoneLookup.error;

    if (emailLookup.data && phoneLookup.data) {
      return res.status(409).json({
        success: false,
        message: "Email id and mobile number already in use",
      });
    }
    if (emailLookup.data) {
      return res.status(409).json({
        success: false,
        message: "Email id already in use",
      });
    }
    if (phoneLookup.data) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already in use",
      });
    }

    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          role: role || ROLES.STUDENT,
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (!data?.user?.id) {
      return res.status(409).json({
        success: false,
        message: "Account already exists. Please login.",
      });
    }

    let session = data.session || null;
    let userForProfile = data.user;

    // If email confirmation is enabled in Supabase, signUp may return no session.
    // Auto-confirm and sign in so users can continue immediately after signup.
    if (!session) {
      const { error: confirmError } =
        await adminClient.auth.admin.updateUserById(data.user.id, {
          email_confirm: true,
        });

      if (confirmError) {
        const text = String(confirmError.message || "").toLowerCase();
        if (text.includes("not found")) {
          return res.status(409).json({
            success: false,
            message: "Account already exists. Please login.",
          });
        }
        throw confirmError;
      }

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        return res
          .status(401)
          .json({ success: false, message: loginError.message });
      }

      session = loginData?.session || null;
      userForProfile = loginData?.user || userForProfile;
    }

    if (session) {
      setAuthCookies(res, session);
    }

    try {
      await ensureProfileRow({
        user: userForProfile,
        role: role || ROLES.STUDENT,
        fullName,
        phone: normalizedPhone,
        email: normalizedEmail,
      });

      if ((role || ROLES.STUDENT) === ROLES.STUDENT) {
        await enforceStudentEligibility({ user: userForProfile });
      }
    } catch (error_) {
      if (error_?.code === "23503") {
        return res.status(409).json({
          success: false,
          message: "Account already exists. Please login.",
        });
      }
      throw error_;
    }

    return res.status(201).json({
      success: true,
      user: {
        id: userForProfile?.id,
        email: normalizedEmail,
        role: role || ROLES.STUDENT,
      },
      hasSession: Boolean(session),
      needsEmailConfirmation: !session,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  clearAuthCookies(res);
  res.json({ success: true });
}

async function googleStart(req, res, next) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const inferredBackendOrigin = `${req.protocol}://${req.get("host")}`;
    const backendOrigin =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_ORIGIN || inferredBackendOrigin
        : inferredBackendOrigin;
    if (!supabaseUrl) {
      return res
        .status(500)
        .json({ success: false, message: "SUPABASE_URL not configured" });
    }

    const codeVerifier = base64Url(crypto.randomBytes(32));
    const codeChallenge = base64Url(sha256(codeVerifier));

    // Reset any previous attempt cookies.
    res.clearCookie("mdpp_oauth_verifier", cookieOptions());
    res.cookie("mdpp_oauth_verifier", codeVerifier, cookieOptions());

    const redirectTo = `${backendOrigin}/api/auth/google/callback`;
    const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectTo);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    // Supabase expects the PKCE method to be exactly "S256".
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    // Always show Google account chooser.
    authorizeUrl.searchParams.set("prompt", "select_account");

    devLog("[oauth] start", {
      host: req.headers.host,
      backendOrigin,
      redirectTo,
    });

    return res.redirect(authorizeUrl.toString());
  } catch (err) {
    next(err);
  }
}

async function googleCallback(req, res, next) {
  try {
    const { code } = req.query;
    const codeVerifier = req.cookies?.mdpp_oauth_verifier;

    devLog("[oauth] callback", {
      host: req.headers.host,
      hasCode: Boolean(code),
      hasVerifier: Boolean(codeVerifier),
    });

    if (!code || !codeVerifier) {
      const frontendOrigin =
        process.env.FRONTEND_ORIGIN || "http://localhost:5173";
      return res.redirect(
        `${frontendOrigin}/login?error=invalid_request&error_code=bad_oauth_state&error_description=Invalid+OAuth+state`,
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || "http://localhost:5173";

    const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=pkce`;
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      devLog("[oauth] token_exchange_failed", {
        status: resp.status,
        body: txt,
      });
      const frontendOrigin =
        process.env.FRONTEND_ORIGIN || "http://localhost:5173";
      return res.redirect(
        `${frontendOrigin}/login?error=oauth_token_exchange_failed&message=${encodeURIComponent(txt)}`,
      );
    }

    const session = await resp.json();
    devLog("[oauth] token_exchange_success", {
      hasAccessToken: Boolean(session?.access_token),
      hasRefreshToken: Boolean(session?.refresh_token),
      tokenType: session?.token_type,
    });

    setAuthCookies(res, session);

    res.clearCookie("mdpp_oauth_verifier", cookieOptions());

    return res.redirect(`${frontendOrigin}/login`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  me,
  login,
  signup,
  logout,
  googleStart,
  googleCallback,
};
