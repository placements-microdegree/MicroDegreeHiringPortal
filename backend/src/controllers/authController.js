const crypto = require("node:crypto");
const {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
} = require("../config/supabaseClient");
const { getSupabaseAdmin } = require("../config/db");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { ROLES } = require("../utils/constants");

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
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
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

function getAdminClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;
  // Fallback to non-cached constructor to give a clearer error.
  return getSupabaseAdminClient();
}

async function ensureProfileRow({ user, role }) {
  const supabase = getAdminClient();
  const phone =
    user.user_metadata?.phone ||
    user.app_metadata?.phone ||
    user.user_metadata?.phone_number ||
    undefined;

  const toSave = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    role,
    updated_at: new Date().toISOString(),
  };
  if (phone) toSave.phone = phone;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(toSave, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function enforceStudentEligibility({ user }) {
  const supabase = getAdminClient();
  const email = user.email?.toLowerCase();
  let phone =
    user.user_metadata?.phone ||
    user.app_metadata?.phone ||
    user.user_metadata?.phone_number ||
    null;

  if (!phone) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    phone = profileRow?.phone || phone;
  }

  if (!phone) {
    return { ok: false, message: "Phone number missing in profile" };
  }

  const { data: enrolled, error: enrollError } = await supabase
    .from("students_enrolled_all")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (enrollError) throw enrollError;
  if (!enrolled) return { ok: false, message: "Not enrolled" };
  if (enrolled.email && enrolled.email.toLowerCase() !== email) {
    return { ok: false, message: "Email mismatch with enrolled data" };
  }
  if (!enrolled.course_fee || Number(enrolled.course_fee) <= 3000) {
    return { ok: false, message: "Not eligible for placements" };
  }

  const baseDate = enrolled.date
    ? new Date(enrolled.date)
    : new Date(enrolled.created_at || Date.now());
  const expiry = new Date(baseDate);
  expiry.setFullYear(expiry.getFullYear() + 2);

  if (Number.isNaN(expiry.getTime())) {
    return { ok: false, message: "Invalid enrollment date" };
  }
  if (new Date() > expiry) {
    return { ok: false, message: "Eligibility expired" };
  }

  const { error: updateError } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    phone,
    role: ROLES.STUDENT,
    is_eligible: true,
    eligible_until: expiry.toISOString(),
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return res.status(401).json({ success: false, message: error.message });
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
        clearAuthCookies(res);
        return res.status(403).json({
          success: false,
          message: eligibility.message,
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

    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || "",
          role: role || ROLES.STUDENT,
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (data.session) {
      setAuthCookies(res, data.session);
    }

    try {
      await ensureProfileRow({
        user: data.user,
        role: role || ROLES.STUDENT,
      });
    } catch (profileErr) {
      // Do not block sign-up if profile insert fails; surface best-effort error.
      devLog("[signup] profile insert failed", profileErr);
    }

    return res.status(201).json({
      success: true,
      user: {
        id: data.user?.id,
        email,
        role: role || ROLES.STUDENT,
      },
      needsEmailConfirmation: !data.session,
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
