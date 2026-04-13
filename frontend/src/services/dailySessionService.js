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

export async function updateDailySessionsSettings(sessions) {
  const data = await request("/api/daily-sessions/settings", {
    method: "PUT",
    body: { sessions },
  });
  return data.sessions || [];
}

export async function joinTestingSession() {
  const data = await request("/api/join-session", {
    method: "POST",
  });
  if (!data?.join_url) {
    throw new Error("Join URL was not received from server");
  }
  return data.join_url;
}
