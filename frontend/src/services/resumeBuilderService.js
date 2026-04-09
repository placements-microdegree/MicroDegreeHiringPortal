import { resolveApiBaseUrl } from "../utils/apiBaseUrl";
import { supabase } from "./supabaseClient";

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
  try {
    let token = "";

    if (supabase) {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
      }

      token = data?.session?.access_token || "";
    }

    // Fallback to backend session endpoint for cookie-based auth flows.
    if (!token) {
      const backendData = await getCurrentSupabaseSession().catch((err) => {
        console.error("Backend session error:", err);
        return null;
      });
      token = backendData?.session?.access_token || "";
    }

    if (token) {
      globalThis.location.href = `${RESUME_BUILDER_BASE_URL}/#access_token=${encodeURIComponent(token)}`;
      return;
    }

    globalThis.location.href = "/login";
  } catch (err) {
    console.error("Unexpected error:", err);
    globalThis.location.href = "/login";
  }
}
