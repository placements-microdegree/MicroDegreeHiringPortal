const jwt = require("jsonwebtoken");
const { getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");
const {
  evaluateCareerReadinessByStudentId,
} = require("./careerReadinessService");

function getSubscriptionSecret() {
  return (
    process.env.EMAIL_SUBSCRIPTION_SECRET ||
    process.env.SMTP_PASS ||
    "microdegree-email-subscription-secret"
  );
}

function createEmailSubscriptionToken(email) {
  return jwt.sign({ email, type: "job_email_subscription" }, getSubscriptionSecret(), {
    expiresIn: "180d",
  });
}

function verifyEmailSubscriptionToken(token) {
  try {
    const decoded = jwt.verify(token, getSubscriptionSecret());
    if (decoded?.type !== "job_email_subscription") {
      const err = new Error("Invalid subscription token");
      err.status = 400;
      throw err;
    }
    if (!decoded?.email) {
      const err = new Error("Invalid subscription token");
      err.status = 400;
      throw err;
    }
    return String(decoded.email).trim().toLowerCase();
  } catch {
    const err = new Error("Subscription link is invalid or expired");
    err.status = 400;
    throw err;
  }
}

function mapProfileSubscription(row) {
  if (!row) return null;
  return {
    email: row.email,
    isEligible: row.is_eligible === true,
    emailSubscribe: row.email_subscribe === true,
  };
}

async function getStudentByEmail(email) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const err = new Error("Database service is unavailable");
    err.status = 503;
    throw err;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, is_eligible, email_subscribe")
    .eq("role", ROLES.STUDENT)
    .ilike("email", email)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getSubscriptionStateByToken(token) {
  const email = verifyEmailSubscriptionToken(token);
  const row = await getStudentByEmail(email);
  if (!row) {
    const err = new Error("Student profile not found for this subscription link");
    err.status = 404;
    throw err;
  }
  return mapProfileSubscription(row);
}

async function setSubscriptionByUserId({ userId, subscribe }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const err = new Error("Database service is unavailable");
    err.status = 503;
    throw err;
  }

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, role, email, is_eligible, email_subscribe")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    const err = new Error("Profile not found");
    err.status = 404;
    throw err;
  }

  if (existing.role !== ROLES.STUDENT) {
    const err = new Error("Only students can update email subscription");
    err.status = 403;
    throw err;
  }

  const requested = Boolean(subscribe);
  let readinessAllowed = false;
  try {
    const readiness = await evaluateCareerReadinessByStudentId({
      studentId: existing.id,
      supabase,
    });
    readinessAllowed = readiness.evaluation.canGetOpportunities;
  } catch {
    readinessAllowed = false;
  }

  const allowedValue = readinessAllowed ? requested : false;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      email_subscribe: allowedValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, email, is_eligible, email_subscribe")
    .single();

  if (error) throw error;

  return {
    email: data.email,
    isEligible: data.is_eligible === true,
    emailSubscribe: data.email_subscribe === true,
  };
}

async function setSubscriptionByToken({ token, subscribe }) {
  const email = verifyEmailSubscriptionToken(token);
  const row = await getStudentByEmail(email);
  const supabase = getSupabaseAdmin();

  if (!row) {
    const err = new Error("Student profile not found for this subscription link");
    err.status = 404;
    throw err;
  }

  const requested = Boolean(subscribe);
  let readinessAllowed = false;
  try {
    const readiness = await evaluateCareerReadinessByStudentId({
      studentId: row.id,
      supabase,
    });
    readinessAllowed = readiness.evaluation.canGetOpportunities;
  } catch {
    readinessAllowed = false;
  }

  const allowedValue = readinessAllowed ? requested : false;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      email_subscribe: allowedValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("email, is_eligible, email_subscribe")
    .single();

  if (error) throw error;

  return {
    email: data.email,
    isEligible: data.is_eligible === true,
    emailSubscribe: data.email_subscribe === true,
  };
}

async function listSubscribedEligibleStudentEmails() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", ROLES.STUDENT)
    .eq("email_subscribe", true)
    .not("email", "is", null);

  if (error) {
    console.error(
      "[emailSubscriptionService] Failed to fetch subscribed student emails:",
      error.message,
    );
    return [];
  }

  const emails = [];
  for (const row of data || []) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const readiness = await evaluateCareerReadinessByStudentId({
        studentId: row.id,
        supabase,
      });
      if (readiness.evaluation.canGetOpportunities && row.email) {
        emails.push(row.email);
      }
    } catch {
      // Skip rows with inconsistent data.
    }
  }

  return emails;
}

module.exports = {
  createEmailSubscriptionToken,
  getSubscriptionStateByToken,
  setSubscriptionByUserId,
  setSubscriptionByToken,
  listSubscribedEligibleStudentEmails,
};
