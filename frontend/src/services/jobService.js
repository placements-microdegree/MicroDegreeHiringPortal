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

export async function listJobs() {
  const data = await request("/api/jobs");
  return data.jobs || [];
}

export async function createJob(job) {
  const data = await request("/api/jobs", { method: "POST", body: job });
  return data.job;
}

export async function updateJob(id, job) {
  const data = await request(`/api/jobs/${id}`, { method: "PUT", body: job });
  return data.job;
}

export async function deleteJob(id) {
  await request(`/api/jobs/${id}`, { method: "DELETE" });
  return true;
}
