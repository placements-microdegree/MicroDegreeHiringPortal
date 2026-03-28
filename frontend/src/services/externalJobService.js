// FILE: src/services/externalJobService.js

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

// Student — list active external jobs
export async function listActiveExternalJobs() {
  const data = await request("/api/external-jobs");
  return data.jobs || [];
}

// HR — list all external jobs
export async function listAllExternalJobs(options = {}) {
  const createdDate = options?.createdDate
    ? String(options.createdDate).trim()
    : "";
  const query = createdDate
    ? `?createdDate=${encodeURIComponent(createdDate)}`
    : "";
  const data = await request(`/api/external-jobs/all${query}`);
  return data.jobs || [];
}

// HR — create
export async function createExternalJob(payload) {
  const data = await request("/api/external-jobs", {
    method: "POST",
    body: payload,
  });
  return data.job;
}

// HR — bulk create
export async function createExternalJobsBulk(jobs) {
  const data = await request("/api/external-jobs/bulk", {
    method: "POST",
    body: { jobs },
  });
  return {
    jobs: data.jobs || [],
    count: Number(data.count || 0),
  };
}

// HR — update
export async function updateExternalJob(id, payload) {
  const data = await request(`/api/external-jobs/${id}`, {
    method: "PUT",
    body: payload,
  });
  return data.job;
}

// HR — delete
export async function deleteExternalJob(id) {
  await request(`/api/external-jobs/${id}`, { method: "DELETE" });
}

// Student — track apply click for analytics
export async function trackExternalJobClick(id) {
  const data = await request(`/api/external-jobs/${id}/click`, {
    method: "POST",
  });
  return {
    id: data.id,
    applyClickCount: Number(data.apply_click_count || 0),
    lastClickedAt: data.last_clicked_at || null,
  };
}

// Student — track page visit to external jobs screen
export async function trackExternalJobsVisit() {
  const data = await request("/api/external-jobs/visit", {
    method: "POST",
  });
  return {
    id: data?.id,
    visitedAt: data?.visitedAt || null,
  };
}

// Super admin — list student visit analytics for external jobs page
export async function getExternalJobsVisitAnalytics() {
  const data = await request("/api/external-jobs/visit-analytics");
  return (
    data?.analytics || {
      totalVisits: 0,
      uniqueStudents: 0,
      lastVisitedAt: null,
      topStudent: null,
      topStudents: [],
    }
  );
}
