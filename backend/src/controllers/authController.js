const crypto = require("node:crypto");
const {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
} = require("../config/supabaseClient");
const { getSupabaseAdmin } = require("../config/db");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { ROLES } = require("../utils/constants");
const { normalizePhone } = require("../utils/phone");
const { sendPasswordOtpEmail } = require("../services/emailService");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_WINDOW_MS = 60 * 1000;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_VERIFY_BLOCK_MS = 10 * 60 * 1000;

const otpVerifyAttempts = new Map();

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function createNumericOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  const random = crypto.randomInt(0, max);
  return String(random).padStart(length, "0");
}

function getOtpHashSalt() {
  return (
    process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function hashOtp(email, otp) {
  const normalizedEmail = normalizeEmail(email);
  const salt = getOtpHashSalt();
  return crypto
    .createHash("sha256")
    .update(`${normalizedEmail}:${otp}:${salt}`)
    .digest("hex");
}

function readOtpAttemptState(key) {
  const now = Date.now();
  const existing = otpVerifyAttempts.get(key);
  if (!existing) return { count: 0, blockedUntil: 0 };
  if (existing.blockedUntil && existing.blockedUntil <= now) {
    otpVerifyAttempts.delete(key);
    return { count: 0, blockedUntil: 0 };
  }
  return existing;
}

function registerFailedOtpAttempt(key) {
  const now = Date.now();
  const current = readOtpAttemptState(key);
  const nextCount = (current.count || 0) + 1;
  const shouldBlock = nextCount >= OTP_MAX_VERIFY_ATTEMPTS;
  const nextState = {
    count: shouldBlock ? 0 : nextCount,
    blockedUntil: shouldBlock ? now + OTP_VERIFY_BLOCK_MS : 0,
  };
  otpVerifyAttempts.set(key, nextState);
  return nextState;
}

function clearOtpAttemptState(key) {
  otpVerifyAttempts.delete(key);
}

async function getOtpRow(supabase, email) {
  const { data, error } = await supabase
    .from("otp_codes")
    .select("email, otp, expires_at, created_at")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteOtpRow(supabase, email) {
  const { error } = await supabase
    .from("otp_codes")
    .delete()
    .eq("email", normalizeEmail(email));
  if (error) throw error;
}

async function verifyOtpForEmail({ supabase, email, otp }) {
  const row = await getOtpRow(supabase, email);
  if (!row) {
    return { ok: false, reason: "invalid" };
  }

  const now = Date.now();
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || now > expiresAtMs) {
    await deleteOtpRow(supabase, email);
    return { ok: false, reason: "expired" };
  }

  const incomingHash = hashOtp(email, otp);
  const isMatch =
    String(incomingHash).length === String(row.otp || "").length &&
    crypto.timingSafeEqual(
      Buffer.from(incomingHash),
      Buffer.from(row.otp || ""),
    );

  if (!isMatch) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, row };
}

function getAdminClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;
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
  let profileApplicationQuota = null; // ← track existing quota
  let phone = normalizePhone(
    user.user_metadata?.phone ||
      user.app_metadata?.phone ||
      user.user_metadata?.phone_number,
  );

  if (!phone) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("phone, created_at, course_fee, application_quota") // ← added application_quota
      .eq("id", user.id)
      .maybeSingle();
    phone = normalizePhone(profileRow?.phone) || phone;
    profileCreatedAt = profileRow?.created_at || null;
    const parsedProfileFee = Number(profileRow?.course_fee);
    profileCourseFee = Number.isFinite(parsedProfileFee)
      ? parsedProfileFee
      : null;
    // Preserve existing quota — null means it has never been set
    profileApplicationQuota =
      profileRow?.application_quota !== undefined &&
      profileRow?.application_quota !== null
        ? Number(profileRow.application_quota)
        : null;
  } else {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("created_at, course_fee, application_quota") // ← added application_quota
      .eq("id", user.id)
      .maybeSingle();
    profileCreatedAt = profileRow?.created_at || null;
    const parsedProfileFee = Number(profileRow?.course_fee);
    profileCourseFee = Number.isFinite(parsedProfileFee)
      ? parsedProfileFee
      : null;
    profileApplicationQuota =
      profileRow?.application_quota !== undefined &&
      profileRow?.application_quota !== null
        ? Number(profileRow.application_quota)
        : null;
  }

  // Use existing quota if already set; only default to 3 on first-time setup.
  // Once set, this value is ONLY decreased by createApplication — never reset here.
  const quotaToUse =
    profileApplicationQuota !== null && Number.isFinite(profileApplicationQuota)
      ? profileApplicationQuota
      : 3;

  const markIneligible = async (message, courseFee = null) => {
    const { error: updateError } = await supabase.from("profiles").upsert({
      id: user.id,
      email,
      phone: phone || null,
      role: ROLES.STUDENT,
      course_fee: Number.isFinite(Number(courseFee)) ? Number(courseFee) : null,
      is_eligible: false,
      eligible_until: null,
      application_quota: quotaToUse, // ← preserved, not reset
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
    application_quota: quotaToUse, // ← preserved, not reset
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

async function session(req, res) {
  if (!req.user?.jwt) {
    return res.json({
      success: true,
      session: null,
    });
  }

  return res.json({
    success: true,
    session: {
      access_token: req.user.jwt,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
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
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || "http://localhost:5173";

    // If user already has a valid session, redirect to frontend instead of re-triggering OAuth
    const existingJwt = req.cookies?.["mdpp_access_token"] || null;
    if (existingJwt) {
      const supabaseCheck = getSupabaseAnonClient();
      const { data, error } = await supabaseCheck.auth.getUser(existingJwt);
      if (!error && data?.user) {
        return res.redirect(`${frontendOrigin}/login`);
      }
    }

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

    res.clearCookie("mdpp_oauth_verifier", cookieOptions());
    res.cookie("mdpp_oauth_verifier", codeVerifier, cookieOptions());

    const redirectTo = `${backendOrigin}/api/auth/google/callback`;
    const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectTo);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
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

async function sendOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid email is required" });
    }

    const adminClient = getAdminClient();
    const existingUser = await findUserByEmail(adminClient, email);
    if (!existingUser?.id) {
      return res
        .status(404)
        .json({ success: false, message: "No account found for this email" });
    }

    const existingOtpRow = await getOtpRow(adminClient, email);
    if (existingOtpRow?.created_at) {
      const createdAtMs = new Date(existingOtpRow.created_at).getTime();
      if (Number.isFinite(createdAtMs)) {
        const elapsed = Date.now() - createdAtMs;
        if (elapsed < OTP_RESEND_WINDOW_MS) {
          const waitForSeconds = Math.ceil(
            (OTP_RESEND_WINDOW_MS - elapsed) / 1000,
          );
          return res.status(429).json({
            success: false,
            message: `Please wait ${waitForSeconds}s before requesting another OTP`,
          });
        }
      }
    }

    const otp = createNumericOtp();
    const otpHash = hashOtp(email, otp);
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: upsertError } = await adminClient.from("otp_codes").upsert(
      {
        email,
        otp: otpHash,
        expires_at: expiresAtIso,
        created_at: nowIso,
      },
      { onConflict: "email" },
    );
    if (upsertError) throw upsertError;

    await sendPasswordOtpEmail({
      to: email,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    if (!email || !isValidEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid email is required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res
        .status(400)
        .json({ success: false, message: "OTP must be a 6-digit code" });
    }

    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const attemptKey = `${email}:${clientIp}`;
    const attemptState = readOtpAttemptState(attemptKey);
    if (attemptState.blockedUntil && attemptState.blockedUntil > Date.now()) {
      const retryAfter = Math.ceil(
        (attemptState.blockedUntil - Date.now()) / 1000,
      );
      return res.status(429).json({
        success: false,
        message: `Too many invalid attempts. Try again in ${retryAfter}s`,
      });
    }

    const adminClient = getAdminClient();
    const verification = await verifyOtpForEmail({
      supabase: adminClient,
      email,
      otp,
    });
    if (!verification.ok) {
      const state = registerFailedOtpAttempt(attemptKey);
      if (verification.reason === "expired") {
        return res
          .status(400)
          .json({
            success: false,
            message: "OTP has expired. Please request a new code",
          });
      }

      if (state.blockedUntil) {
        return res.status(429).json({
          success: false,
          message: "Too many invalid attempts. Please request a new OTP later",
        });
      }

      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    clearOtpAttemptState(attemptKey);
    return res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !isValidEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid email is required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res
        .status(400)
        .json({ success: false, message: "OTP must be a 6-digit code" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const adminClient = getAdminClient();
    const user = await findUserByEmail(adminClient, email);
    if (!user?.id) {
      return res
        .status(404)
        .json({ success: false, message: "No account found for this email" });
    }

    const verification = await verifyOtpForEmail({
      supabase: adminClient,
      email,
      otp,
    });
    if (!verification.ok) {
      const message =
        verification.reason === "expired"
          ? "OTP has expired. Please request a new code"
          : "Invalid OTP";
      return res.status(400).json({ success: false, message });
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      },
    );
    if (resetError) throw resetError;

    await deleteOtpRow(adminClient, email);

    return res.json({
      success: true,
      message: "Password reset successful. Please login with your new password",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  me,
  session,
  login,
  signup,
  logout,
  googleStart,
  googleCallback,
  sendOtp,
  verifyOtp,
  resetPassword,
};
