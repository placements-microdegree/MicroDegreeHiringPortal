const { getSupabaseAnonClient } = require("../config/supabaseClient");
const { REFRESH_COOKIE, setAuthCookies } = require("../utils/cookies");
const { ROLES } = require("../utils/constants");
const { trackDailyUserActivity } = require("../services/activityService");

const ACCESS_COOKIE = "mdpp_access_token";

function parseBearer(headerValue) {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function verifyToken(req, res, next) {
  try {
    const headerToken = parseBearer(req.headers.authorization);
    const cookieToken = req.cookies?.[ACCESS_COOKIE] || null;
    let jwt = headerToken || cookieToken || null;
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || null;

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[auth] verifyToken", {
        path: req.path,
        hasAuthorizationHeader: Boolean(headerToken),
        hasAccessCookie: Boolean(cookieToken),
      });
    }

    if (!jwt && refreshToken) {
      const supabase = getSupabaseAnonClient();
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (!error && data?.session?.access_token) {
        setAuthCookies(res, data.session);
        jwt = data.session.access_token;
      }
    }

    if (!jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Missing Bearer token" });
    }

    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data?.user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = data.user;
    req.user = {
      id: user.id,
      email: user.email,
      role:
        user.user_metadata?.role || user.app_metadata?.role || ROLES.STUDENT,
      raw: user,
      jwt,
    };

    // Fire-and-forget activity tracking for accurate DAU.
    trackDailyUserActivity({
      userId: req.user.id,
      role: req.user.role,
      method: req.method,
      path: req.originalUrl || req.path,
    }).catch(() => {
      // Intentionally ignored: activity tracking must never block auth flow.
    });

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = verifyToken;
