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

export async function createStudentReferralStepOne(payload) {
  const data = await request("/api/referrals", {
    method: "POST",
    body: payload,
  });

  return data.referral;
}

export async function submitStudentReferralFollowUp(referralId, payload) {
  const data = await request(`/api/referrals/${referralId}/follow-up`, {
    method: "PATCH",
    body: payload,
  });

  return data.referral;
}

export async function listReferredDataForAdmin() {
  const data = await request("/api/referrals/admin/list");
  return data.referrals || [];
}
