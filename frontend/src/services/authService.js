import { ROLES } from "../utils/constants";
import { resolveApiBaseUrl } from "../utils/apiBaseUrl";

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, { method = "GET", body, headers } = {}) {
  const isForm = body instanceof FormData;

  let requestHeaders = headers ? { ...headers } : undefined;
  if (body && !isForm) {
    requestHeaders = requestHeaders || {};
    requestHeaders["Content-Type"] = "application/json";
  }

  let requestBody;
  if (body == null) requestBody = undefined;
  else if (isForm) requestBody = body;
  else requestBody = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    credentials: "include",
    body: requestBody,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

export async function getSession() {
  try {
    const data = await request("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function loginWithPassword({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data.user;
}

export async function signupWithPassword({
  fullName,
  email,
  password,
  phone,
  role = ROLES.STUDENT,
}) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: { fullName, email, password, phone, role },
  });
  return {
    user: data.user || null,
    hasSession: Boolean(data.hasSession),
    needsEmailConfirmation: Boolean(data.needsEmailConfirmation),
  };
}

export async function loginWithGoogle() {
  globalThis.location.href = `${API_BASE_URL}/api/auth/google/start`;
}

export async function sendPasswordOtp(email) {
  const data = await request("/api/auth/send-otp", {
    method: "POST",
    body: { email },
  });
  return data;
}

export async function verifyPasswordOtp({ email, otp }) {
  const data = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { email, otp },
  });
  return data;
}

export async function resetPasswordWithOtp({ email, otp, newPassword }) {
  const data = await request("/api/auth/reset-password", {
    method: "POST",
    body: { email, otp, newPassword },
  });
  return data;
}

export async function logout() {
  await request("/api/auth/logout", { method: "POST" });
}

export async function getProfile() {
  const data = await request("/api/profile/me");
  return data.profile;
}

export async function updateProfile(nextProfile) {
  const data = await request("/api/profile/me", {
    method: "PUT",
    body: nextProfile,
  });
  return data.profile;
}

export async function updateEmailSubscription(emailSubscribe) {
  const data = await request("/api/profile/me/email-subscription", {
    method: "PATCH",
    body: { emailSubscribe: Boolean(emailSubscribe) },
  });
  return data.subscription;
}

export async function getEmailSubscriptionByToken(token) {
  const encodedToken = encodeURIComponent(String(token || ""));
  const data = await request(
    `/api/profile/email-subscription/by-token?token=${encodedToken}`,
  );
  return data.subscription;
}

export async function updateEmailSubscriptionByToken({
  token,
  emailSubscribe,
}) {
  const data = await request("/api/profile/email-subscription/by-token", {
    method: "POST",
    body: {
      token: String(token || ""),
      emailSubscribe: Boolean(emailSubscribe),
    },
  });
  return data.subscription;
}
