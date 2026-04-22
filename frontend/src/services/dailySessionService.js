import { resolveApiBaseUrl } from "../utils/apiBaseUrl";

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export async function listDailySessions() {
  const data = await request("/api/daily-sessions");
  return data.sessions || [];
}

export async function createDailySession(session) {
  const data = await request("/api/daily-sessions", {
    method: "POST",
    body: session,
  });
  return data.session || null;
}

export async function updateDailySession(sessionId, session) {
  const data = await request(`/api/daily-sessions/${sessionId}`, {
    method: "PUT",
    body: session,
  });
  return data.session || null;
}

export async function updateDailySessionStatus(sessionId, enabled) {
  const data = await request(`/api/daily-sessions/${sessionId}/status`, {
    method: "PATCH",
    body: { enabled: enabled === true },
  });
  return data.session || null;
}

export async function updateDailySessionsSettings(sessions) {
  const data = await request("/api/daily-sessions/settings", {
    method: "PUT",
    body: { sessions },
  });
  return data.sessions || [];
}

export async function joinTestingSession(sessionId) {
  const data = await request("/api/join-session", {
    method: "POST",
    body: sessionId ? { sessionId } : undefined,
  });

  return {
    joinUrl: data?.join_url || "",
    canJoin: data?.can_join === true,
    registered: data?.registered === true,
    role: data?.role || "",
    message: data?.message || "",
  };
}
