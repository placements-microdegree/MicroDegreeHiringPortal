import { resolveApiBaseUrl } from "../utils/apiBaseUrl";

const API_BASE_URL = resolveApiBaseUrl();
const RESUME_BUILDER_BASE_URL = "https://resumes.microdegree.work";

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
  return (
    data?.analytics || {
      totalClicks: 0,
      uniqueStudents: 0,
      lastClickedAt: null,
      topStudent: null,
      topStudents: [],
    }
  );
}

export async function getCurrentSupabaseSession() {
  const data = await request("/api/auth/session");
  return data;
}

export async function redirectToResumeBuilderWithSession() {
  const data = await getCurrentSupabaseSession();

  if (data?.session?.access_token) {
    const token = data.session.access_token;
    globalThis.location.href = `${RESUME_BUILDER_BASE_URL}?token=${encodeURIComponent(token)}`;
    return;
  }

  globalThis.location.href = "/login";
}
