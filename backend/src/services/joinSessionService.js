const profileService = require("./profileService");

const tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getRequiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const err = new Error(`Missing required env var: ${name}`);
    err.status = 500;
    throw err;
  }
  return value;
}

function getZoomConfig() {
  const rawMeetingId = getRequiredEnv("ZOOM_MEETING_ID");
  return {
    accountId: getRequiredEnv("ZOOM_ACCOUNT_ID"),
    clientId: getRequiredEnv("ZOOM_CLIENT_ID"),
    clientSecret: getRequiredEnv("ZOOM_CLIENT_SECRET"),
    authUrl: String(
      process.env.ZOOM_AUTH_URL || "https://zoom.us/oauth/token",
    ).trim(),
    baseUrl: String(
      process.env.ZOOM_BASE_URL || "https://api.zoom.us/v2",
    ).trim(),
    meetingId: rawMeetingId.replaceAll(/\D/g, ""),
    tokenCacheTtl: Number(process.env.ZOOM_TOKEN_CACHE_TTL || 3500),
    disableZoomEmail: toBoolean(process.env.DISABLE_ZOOM_EMAIL, true),
  };
}

function buildDisplayName({ isEligible, fullName, email }) {
  const prefix = isEligible ? "[STUDENT]" : "[TRIAL]";
  const cleanName = String(fullName || "").trim();
  const fallbackName = String(email || "").split("@")[0] || "Learner";
  return `${prefix} ${cleanName || fallbackName}`.trim();
}

function toRegistrantNameParts(displayName) {
  const clean = String(displayName || "")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (!clean) {
    return { firstName: "Learner", lastName: "User" };
  }

  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "User" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
  };
}

function buildAuthHeader(clientId, clientSecret) {
  const raw = `${clientId}:${clientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

async function fetchZoomAccessToken({ forceRefresh = false } = {}) {
  const config = getZoomConfig();
  const now = Date.now();

  if (!forceRefresh && tokenCache.accessToken && tokenCache.expiresAt > now) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: config.accountId,
  });

  const response = await fetch(`${config.authUrl}?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(config.clientId, config.clientSecret),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    const err = new Error(
      payload?.message || "Failed to authenticate with Zoom",
    );
    err.status = 502;
    throw err;
  }

  const expiresInSeconds = Number(
    payload.expires_in || config.tokenCacheTtl || 3500,
  );
  tokenCache.accessToken = payload.access_token;
  tokenCache.expiresAt = now + Math.max(60, expiresInSeconds - 30) * 1000;

  return tokenCache.accessToken;
}

async function requestZoom(path, { method = "GET", accessToken, body } = {}) {
  const config = getZoomConfig();
  const url = `${config.baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function findRegistrantInStatus({
  accessToken,
  meetingId,
  normalizedEmail,
  status,
}) {
  let nextPageToken = "";
  let pageCount = 0;

  while (pageCount < 20) {
    pageCount += 1;

    const query = new URLSearchParams({
      status,
      page_size: "300",
    });
    if (nextPageToken) query.set("next_page_token", nextPageToken);

    const { response, payload } = await requestZoom(
      `/meetings/${encodeURIComponent(meetingId)}/registrants?${query.toString()}`,
      { accessToken },
    );

    if (!response.ok || !payload) {
      return "";
    }

    const registrants = Array.isArray(payload.registrants)
      ? payload.registrants
      : [];
    const match = registrants.find(
      (item) =>
        String(item?.email || "")
          .trim()
          .toLowerCase() === normalizedEmail,
    );
    if (match?.join_url) return String(match.join_url);

    nextPageToken = String(payload.next_page_token || "").trim();
    if (!nextPageToken) return "";
  }

  return "";
}

async function findExistingRegistrantJoinUrl({
  accessToken,
  meetingId,
  email,
}) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return "";

  const statuses = ["approved", "pending", "denied"];

  for (const status of statuses) {
    const joinUrl = await findRegistrantInStatus({
      accessToken,
      meetingId,
      normalizedEmail,
      status,
    });
    if (joinUrl) return joinUrl;
  }

  return "";
}

function looksLikeDuplicateRegistrant(response, payload) {
  if (response.status === 409) return true;

  const code = Number(payload?.code || 0);
  if ([300, 1005].includes(code)) return true;

  const message = String(payload?.message || "").toLowerCase();
  return message.includes("already") && message.includes("registrant");
}

async function registerUserForMeeting({
  accessToken,
  meetingId,
  email,
  displayName,
  disableZoomEmail,
}) {
  const nameParts = toRegistrantNameParts(displayName);
  const body = {
    email,
    first_name: nameParts.firstName,
    last_name: nameParts.lastName,
  };

  if (disableZoomEmail) {
    body.send_email = false;
  }

  let { response, payload } = await requestZoom(
    `/meetings/${encodeURIComponent(meetingId)}/registrants`,
    {
      method: "POST",
      accessToken,
      body,
    },
  );

  const message = String(payload?.message || "").toLowerCase();
  if (
    disableZoomEmail &&
    response.status === 400 &&
    message.includes("send_email")
  ) {
    const fallbackBody = {
      email,
      first_name: nameParts.firstName,
      last_name: nameParts.lastName,
    };

    ({ response, payload } = await requestZoom(
      `/meetings/${encodeURIComponent(meetingId)}/registrants`,
      {
        method: "POST",
        accessToken,
        body: fallbackBody,
      },
    ));
  }

  if (
    (response.status === 201 || response.status === 200) &&
    payload?.join_url
  ) {
    return { joinUrl: String(payload.join_url), needsTokenRefresh: false };
  }

  if (response.status === 401) {
    return { joinUrl: "", needsTokenRefresh: true };
  }

  if (looksLikeDuplicateRegistrant(response, payload)) {
    const existingJoinUrl = await findExistingRegistrantJoinUrl({
      accessToken,
      meetingId,
      email,
    });

    if (existingJoinUrl) {
      return { joinUrl: existingJoinUrl, needsTokenRefresh: false };
    }
  }

  const err = new Error(
    payload?.message || "Failed to register for the live class",
  );
  err.status = 502;
  throw err;
}

async function createJoinSessionLink({ userId, jwt, email, fallbackName }) {
  const config = getZoomConfig();

  const profile = await profileService.getProfileByUserId({ userId, jwt });
  const isEligible = profile?.is_eligible === true;
  const displayName = buildDisplayName({
    isEligible,
    fullName: profile?.full_name || fallbackName,
    email,
  });

  let accessToken = await fetchZoomAccessToken();

  let result = await registerUserForMeeting({
    accessToken,
    meetingId: config.meetingId,
    email,
    displayName,
    disableZoomEmail: config.disableZoomEmail,
  });

  if (result.needsTokenRefresh) {
    accessToken = await fetchZoomAccessToken({ forceRefresh: true });
    result = await registerUserForMeeting({
      accessToken,
      meetingId: config.meetingId,
      email,
      displayName,
      disableZoomEmail: config.disableZoomEmail,
    });
  }

  if (!result.joinUrl) {
    const err = new Error("Zoom did not return a join URL");
    err.status = 502;
    throw err;
  }

  return {
    joinUrl: result.joinUrl,
    role: isEligible ? "STUDENT" : "TRIAL",
  };
}

module.exports = {
  createJoinSessionLink,
};
