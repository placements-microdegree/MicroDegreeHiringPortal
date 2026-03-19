const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

const CONNECTION_TYPES = new Set([
  "i_work_here",
  "friend_works_here",
  "saw_online",
]);

const FOLLOW_UP_TYPES = new Set([
  "direct_referral",
  "share_contact",
  "team_decide",
]);

function getClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

function asTrimmedString(value) {
  return String(value || "").trim();
}

function ensureStepOnePayload(payload) {
  const companyName = asTrimmedString(payload?.companyName);
  const roleDetails = asTrimmedString(payload?.roleDetails);
  const jobLocation = asTrimmedString(payload?.location);
  const connectionType = asTrimmedString(payload?.connectionType);
  const comments = asTrimmedString(payload?.comments) || null;
  const confirmationAcknowledged = Boolean(payload?.confirmationAcknowledged);

  if (!companyName) {
    const err = new Error("Company name is required");
    err.status = 400;
    throw err;
  }

  if (!roleDetails) {
    const err = new Error("Role/Job details is required");
    err.status = 400;
    throw err;
  }

  if (!jobLocation) {
    const err = new Error("Location is required");
    err.status = 400;
    throw err;
  }

  if (!CONNECTION_TYPES.has(connectionType)) {
    const err = new Error("Please select a valid connection type");
    err.status = 400;
    throw err;
  }

  if (!confirmationAcknowledged) {
    const err = new Error("Please confirm before sharing with placement team");
    err.status = 400;
    throw err;
  }

  return {
    companyName,
    roleDetails,
    jobLocation,
    connectionType,
    comments,
    confirmationAcknowledged,
  };
}

function ensureFollowUpPayload(payload) {
  const followUpType = asTrimmedString(payload?.followUpType);
  const followUpContact = asTrimmedString(payload?.followUpContact) || null;
  const followUpNote = asTrimmedString(payload?.followUpNote) || null;

  if (!FOLLOW_UP_TYPES.has(followUpType)) {
    const err = new Error("Please choose a valid follow-up option");
    err.status = 400;
    throw err;
  }

  if (followUpType === "share_contact" && !followUpContact) {
    const err = new Error("Contact details are required for this option");
    err.status = 400;
    throw err;
  }

  return {
    followUpType,
    followUpContact,
    followUpNote,
  };
}

async function createReferralStepOne({ jwt, studentId, payload }) {
  const supabase = getClient(jwt);
  const validated = ensureStepOnePayload(payload);

  const { data, error } = await supabase
    .from("student_job_referrals")
    .insert({
      student_id: studentId,
      company_name: validated.companyName,
      role_details: validated.roleDetails,
      job_location: validated.jobLocation,
      connection_type: validated.connectionType,
      comments: validated.comments,
      confirmation_acknowledged: validated.confirmationAcknowledged,
      status: "awaiting_followup",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function submitReferralFollowUp({ jwt, studentId, referralId, payload }) {
  const supabase = getClient(jwt);
  const validated = ensureFollowUpPayload(payload);

  const { data, error } = await supabase
    .from("student_job_referrals")
    .update({
      follow_up_type: validated.followUpType,
      follow_up_contact: validated.followUpContact,
      follow_up_note: validated.followUpNote,
      status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralId)
    .eq("student_id", studentId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Referral not found");
    err.status = 404;
    throw err;
  }

  return data;
}

async function listReferredData({ jwt }) {
  const supabase = getClient(jwt);

  const { data, error } = await supabase
    .from("student_job_referrals")
    .select(
      "id, student_id, company_name, role_details, job_location, connection_type, comments, follow_up_type, follow_up_contact, follow_up_note, status, created_at, updated_at, profiles!student_job_referrals_student_id_fkey(full_name, email, phone)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = {
  createReferralStepOne,
  submitReferralFollowUp,
  listReferredData,
};
