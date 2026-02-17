const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export async function uploadResumes(files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const data = await request("/api/resumes/upload", {
    method: "POST",
    body: form,
  });
  return data.resumes || [];
}

export async function listMyResumes() {
  const data = await request("/api/resumes/me");
  return data.resumes || [];
}

export async function deleteResume(id) {
  await request(`/api/resumes/${id}`, { method: "DELETE" });
  return true;
}
