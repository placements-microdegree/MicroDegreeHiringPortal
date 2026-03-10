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

export async function promoteAdmin(email) {
  const data = await request("/api/admin/promote", {
    method: "POST",
    body: { email, role: "ADMIN" },
  });
  return data.profile;
}

export async function listStudents() {
  const data = await request("/api/admin/students");
  return data.students || [];
}

export async function listAdmins() {
  const data = await request("/api/admin/admins");
  return data.admins || [];
}

export async function getAnalytics() {
  const data = await request("/api/admin/analytics");
  return data.analytics || {};
}

export async function checkerSearch({ type, query }) {
  const params = new URLSearchParams({
    type: String(type || "").trim(),
    query: String(query || "").trim(),
  });
  const data = await request(`/api/admin/checker?${params.toString()}`);
  return {
    student: data.student || null,
    applications: data.applications || [],
  };
}
