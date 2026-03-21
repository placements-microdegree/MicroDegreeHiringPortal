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

export async function trackResumeBuilderClick() {
  const data = await request("/api/resume-builder/click", { method: "POST" });
  return {
    id: data?.id,
    clickedAt: data?.clickedAt || null,
  };
}

export async function getResumeBuilderAnalytics() {
  const data = await request("/api/resume-builder/analytics");
  return data?.analytics || {
    totalClicks: 0,
    uniqueStudents: 0,
    lastClickedAt: null,
    topStudent: null,
    topStudents: [],
  };
}
