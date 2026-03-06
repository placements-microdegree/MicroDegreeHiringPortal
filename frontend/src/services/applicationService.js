// FILE: src/services/applicationService.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

export async function createApplication(payload) {
  const data = await request("/api/applications/apply", { method: "POST", body: payload });
  return data.application;
}

export async function listApplicationsByStudent() {
  const data = await request("/api/applications/me");
  return data.applications || [];
}

export async function listAllApplications() {
  const data = await request("/api/applications");
  return data.applications || [];
}

export async function updateApplicationStatus(applicationId, status) {
  const data = await request(`/api/applications/${applicationId}/status`, {
    method: "PATCH", body: { status },
  });
  return data.application;
}

export async function updateApplicationComment(applicationId, comment) {
  const data = await request(`/api/applications/${applicationId}/comment`, {
    method: "PATCH", body: { comment },
  });
  return data.application;
}

export async function applyOnBehalf(payload) {
  const data = await request("/api/applications/apply-on-behalf", {
    method: "POST", body: payload,
  });
  return data.application;
}

export async function getStudentAnalytics() {
  const data = await request("/api/applications/analytics/me");
  return data.analytics || {};
}

// Search students by name, email or phone
export async function searchStudents(query) {
  const params = new URLSearchParams({ q: query });
  const data = await request(`/api/applications/search-students?${params.toString()}`);
  return data.students || [];
}

// Fetch a student's profile for HR apply-on-behalf pre-fill
export async function getStudentProfileForHR(studentId) {
  const data = await request(`/api/applications/student-profile/${studentId}`);
  return data.profile || null;
}

// Fetch a student's resumes for HR resume selector
export async function getStudentResumesForHR(studentId) {
  const data = await request(`/api/applications/student-resumes/${studentId}`);
  return data.resumes || [];
}