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

export async function getNextDrive() {
  const data = await request("/api/cloud-drive/next");
  return data;
}

export async function registerForDrive(payload) {
  const data = await request("/api/cloud-drive/register", { method: "POST", body: payload });
  return data.registration;
}

export async function listRegistrations(params) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const data = await request(`/api/cloud-drive/admin/registrations${qs}`);
  return data.registrations || [];
}

export async function upsertDrive(payload) {
  const data = await request(`/api/cloud-drive/admin/drive`, { method: "POST", body: payload });
  return data.drive;
}

export async function listDrives() {
  const data = await request(`/api/cloud-drive/admin/drives`);
  return data.drives || [];
}

export async function updateRegistration(id, changes) {
  const data = await request(`/api/cloud-drive/admin/registrations/${id}`, { method: "PUT", body: changes });
  return data.registration;
}
