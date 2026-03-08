// FILE: src/services/profileService.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { method = "GET", body, headers } = {}) {
  const isForm = body instanceof FormData;

  let requestHeaders = headers ? { ...headers } : undefined;
  if (body && !isForm) {
    requestHeaders = requestHeaders || {};
    requestHeaders["Content-Type"] = "application/json";
  }

  // ⚠️ IMPORTANT: must stringify plain objects — raw object sends "[object Object]"
  let requestBody;
  if (body == null)   requestBody = undefined;
  else if (isForm)    requestBody = body;
  else                requestBody = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    credentials: "include",
    body: requestBody,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

export async function uploadProfilePhoto(file) {
  const form = new FormData();
  form.append("file", file);
  const data = await request("/api/profile/photo", {
    method: "POST",
    body: form,
  });
  return { url: data.url, profile: data.profile };
}