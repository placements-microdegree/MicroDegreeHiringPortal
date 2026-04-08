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

export async function listFavoriteStudents() {
  const data = await request("/api/admin/favorites/students");
  return data.favoriteStudentIds || [];
}

export async function addFavoriteStudents(studentIds) {
  const data = await request("/api/admin/favorites/students", {
    method: "POST",
    body: { studentIds },
  });
  return data.favoriteStudentIds || [];
}

export async function removeFavoriteStudents(studentIds) {
  const data = await request("/api/admin/favorites/students", {
    method: "DELETE",
    body: { studentIds },
  });
  return data.favoriteStudentIds || [];
}

export async function listFavoritePlaylists() {
  const data = await request("/api/admin/favorites/playlists");
  return data.playlists || [];
}

export async function createFavoritePlaylist({ name, studentIds }) {
  const data = await request("/api/admin/favorites/playlists", {
    method: "POST",
    body: { name, studentIds },
  });
  return data.playlist || null;
}

export async function addStudentsToFavoritePlaylist(playlistId, studentIds) {
  const data = await request(
    `/api/admin/favorites/playlists/${playlistId}/students`,
    {
      method: "POST",
      body: { studentIds },
    },
  );
  return data.playlist || null;
}

export async function deleteFavoritePlaylist(playlistId) {
  const data = await request(`/api/admin/favorites/playlists/${playlistId}`, {
    method: "DELETE",
  });
  return data.playlist || null;
}

export async function updateStudentCloudDriveProfile(
  studentId,
  { cloudDriveStatus, driveClearedDate, cloudDriveHistory },
) {
  const data = await request(
    `/api/admin/students/${studentId}/cloud-drive-profile`,
    {
      method: "PUT",
      body: { cloudDriveStatus, driveClearedDate, cloudDriveHistory },
    },
  );
  return data.student;
}

export async function listAdmins() {
  const data = await request("/api/admin/admins");
  return data.admins || [];
}

export async function getAnalytics({ from, to } = {}) {
  const params = new URLSearchParams();

  if (from) params.set("from", String(from).trim());
  if (to) params.set("to", String(to).trim());

  const query = params.toString();
  const data = await request(
    query ? `/api/admin/analytics?${query}` : "/api/admin/analytics",
  );
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
