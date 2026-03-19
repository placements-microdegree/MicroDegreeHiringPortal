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

export async function listNotifications() {
  const data = await request("/api/notifications");
  return data.notifications || [];
}

export async function markNotificationRead(notificationId) {
  const data = await request(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return data.notification || null;
}

export async function markAllNotificationsRead() {
  await request("/api/notifications/read-all", {
    method: "PATCH",
  });
}
