// FILE: src/services/applicationService.js
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

export async function createApplication(payload) {
  const data = await request("/api/applications/apply", {
    method: "POST",
    body: payload,
  });
  return data.application;
}

export async function listApplicationsByStudent() {
  const data = await request("/api/applications/me");
  return data.applications || [];
}

export async function updateMyApplication(applicationId, payload) {
  const data = await request(`/api/applications/my/${applicationId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.application;
}

export async function listAllApplications() {
  const data = await request("/api/applications");
  return data.applications || [];
}

export async function updateApplicationStatus(
  applicationId,
  status,
  options = {},
) {
  const { stage, subStage } = options;
  const data = await request(`/api/applications/${applicationId}/status`, {
    method: "PATCH",
    body: { status, stage, subStage },
  });
  return data.application;
}

export async function updateApplicationComment(
  applicationId,
  comment,
  comment2 = "",
  options = {},
) {
  const { aiSuggestionId = null, aiApproved = false } = options;
  const data = await request(`/api/applications/${applicationId}/comment`, {
    method: "PATCH",
    body: { comment, comment2, aiSuggestionId, aiApproved },
  });
  return data.application;
}

export async function deleteApplication(applicationId) {
  await request(`/api/applications/${applicationId}`, {
    method: "DELETE",
  });
}

export async function applyOnBehalf(payload) {
  const data = await request("/api/applications/apply-on-behalf", {
    method: "POST",
    body: payload,
  });
  return data.application;
}

export async function getStudentAnalytics() {
  const data = await request("/api/applications/analytics/me");
  return data.analytics || {};
}

export async function listCareerProgressBoard() {
  const data = await request("/api/applications/career-progress/me");
  return data.progress || [];
}

// Search students by name, email or phone
export async function searchStudents(query) {
  const params = new URLSearchParams({ q: query });
  const data = await request(
    `/api/applications/search-students?${params.toString()}`,
  );
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

// HR uploads one or more resumes on behalf of a student — saved to their profile in DB + storage
export async function uploadResumesForStudent(studentId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch(
    `${API_BASE_URL}/api/applications/student-resumes/${studentId}/upload`,
    { method: "POST", credentials: "include", body: formData },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Upload failed");
  return data.resumes || [];
}

// HR deletes a student's resume by id
export async function deleteResumeForStudent(resumeId) {
  await request(`/api/applications/student-resumes/${resumeId}`, {
    method: "DELETE",
  });
}

export async function generateAiCommentSuggestion(
  applicationId,
  { regenerate = false } = {},
) {
  const data = await request(
    `/api/applications/${applicationId}/ai-comment-suggestion`,
    {
      method: "POST",
      body: { regenerate },
    },
  );
  return data.suggestion || null;
}

export async function listApplicationCommentHistory(
  applicationId,
  options = {},
) {
  const limit = options?.limit;
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));

  const query = params.toString();
  const path = query
    ? `/api/applications/${applicationId}/comment-history?${query}`
    : `/api/applications/${applicationId}/comment-history`;

  const data = await request(path);
  return data.history || [];
}
