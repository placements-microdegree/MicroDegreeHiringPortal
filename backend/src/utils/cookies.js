const ACCESS_COOKIE = "mdpp_access_token";
const REFRESH_COOKIE = "mdpp_refresh_token";

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  // Treat as "secure deployment" when backend is configured with an https origin.
  // This makes cross-site auth work on Render even if NODE_ENV wasn't set.
  const isHttpsDeployment = (process.env.BACKEND_ORIGIN || "").startsWith(
    "https://",
  );
  const shouldUseSecureCookies = isProd || isHttpsDeployment;
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies,
    sameSite: shouldUseSecureCookies ? "none" : "lax",
    path: "/",
  };
}

function setAuthCookies(res, session) {
  const opts = getCookieOptions();

  res.cookie(ACCESS_COOKIE, session.access_token, {
    ...opts,
    maxAge: (session.expires_in || 3600) * 1000,
  });

  if (session.refresh_token) {
    res.cookie(REFRESH_COOKIE, session.refresh_token, {
      ...opts,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}

function clearAuthCookies(res) {
  const opts = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  clearAuthCookies,
};
