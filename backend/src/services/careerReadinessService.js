const { getSupabaseAdmin } = require("../config/db");

const CLEARED_CLOUD_DRIVE_STATUSES = new Set([
  "PASSED",
  "CLEARED",
  "READY_FOR_INTERVIEWS",
  "PRACTICAL ONLINE TASK ROUND CLEARED",
  "FACE-TO-FACE ROUND (LIVE INTERVIEW) CLEARED",
  "MANAGERIAL ROUND CLEARED",
  "CLEARED AWS DRIVE",
  "CLEARED DEVOPS DRIVE",
]);

const BLOCKING_FLAGS = new Set(["ON_HOLD", "BLACKLISTED"]);

const PROFILE_COMPLETION_RULES = [
  { key: "full_name", label: "Complete profile name" },
  { key: "email", label: "Add profile email" },
  { key: "phone", label: "Add profile phone" },
  { key: "location", label: "Add current location" },
  { key: "skills", label: "Add skills" },
  { key: "experience_level", label: "Add experience level" },
];

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeFlags(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Set();
  values.forEach((value) => {
    const text = toText(value);
    if (text) unique.add(text);
  });
  return [...unique];
}

function hasProfileField(profile, key) {
  if (!profile) return false;
  if (key === "skills") {
    if (Array.isArray(profile.skills)) {
      return profile.skills.map((item) => toText(item)).filter(Boolean).length > 0;
    }
    return toText(profile.skills).length > 0;
  }
  return toText(profile[key]).length > 0;
}

function evaluateProfileCompletion(profile) {
  const missing = PROFILE_COMPLETION_RULES.filter((rule) => !hasProfileField(profile, rule.key));
  const completedCount = PROFILE_COMPLETION_RULES.length - missing.length;
  const percentage = Math.round((completedCount / PROFILE_COMPLETION_RULES.length) * 100);
  return {
    isComplete: missing.length === 0,
    percentage,
    missingSteps: missing.map((rule) => rule.label),
  };
}

function isClearedStatus(value) {
  return CLEARED_CLOUD_DRIVE_STATUSES.has(toText(value).toUpperCase());
}

function evaluateCloudDriveCleared(profile) {
  const latestStatus = toText(profile?.cloud_drive_status);
  if (isClearedStatus(latestStatus)) {
    return { isCleared: true, matchedStatus: latestStatus };
  }

  const historical = Array.isArray(profile?.cloud_drive_status_history)
    ? profile.cloud_drive_status_history
    : [];

  const matchedHistory = historical.find((entry) => isClearedStatus(entry?.status));
  if (matchedHistory) {
    return {
      isCleared: true,
      matchedStatus: toText(matchedHistory.status),
    };
  }

  const clearedStatusArray = Array.isArray(profile?.drive_cleared_status)
    ? profile.drive_cleared_status
    : [];
  const matchedFromArray = clearedStatusArray.find((status) => isClearedStatus(status));

  return {
    isCleared: Boolean(matchedFromArray),
    matchedStatus: toText(matchedFromArray),
  };
}

function findActiveResume(resumes, activeResumeId) {
  if (!Array.isArray(resumes) || resumes.length === 0) return null;
  const normalizedActiveId = toText(activeResumeId);
  if (normalizedActiveId) {
    const exact = resumes.find((resume) => toText(resume.id) === normalizedActiveId);
    if (exact) return exact;
  }
  return resumes[0] || null;
}

function evaluateResumeApproval(profile, resumes) {
  const activeResume = findActiveResume(resumes, profile?.active_resume_id);
  const approvalStatus = toText(activeResume?.approval_status || "PENDING").toUpperCase();
  return {
    activeResumeId: activeResume?.id || null,
    activeResumeApprovalStatus: approvalStatus || "PENDING",
    isApproved: approvalStatus === "APPROVED",
    hasActiveResume: Boolean(activeResume?.id),
  };
}

function evaluateBlockingFlags(profile) {
  const flags = normalizeFlags(profile?.internal_flags);
  const blocking = flags.filter((flag) => BLOCKING_FLAGS.has(flag));
  return {
    allFlags: flags,
    blockingFlags: blocking,
    isBlocked: blocking.length > 0,
  };
}

function hasLegacyEligibilityAccess(profile) {
  if (profile?.is_eligible !== true) return false;

  const eligibleUntil = toText(profile?.eligible_until);
  if (!eligibleUntil) return true;

  const eligibleUntilDate = new Date(eligibleUntil);
  if (Number.isNaN(eligibleUntilDate.getTime())) return true;

  return eligibleUntilDate.getTime() >= Date.now();
}

function buildMissingSteps({ cloudDrive, profileCompletion, resumeApproval, blockingFlags }) {
  const steps = [];

  if (!cloudDrive.isCleared) steps.push("Clear Cloud Drive");
  if (!profileCompletion.isComplete) steps.push("Complete profile form");
  if (!resumeApproval.hasActiveResume) {
    steps.push("Upload and select active resume");
  } else if (!resumeApproval.isApproved) {
    steps.push("Get active resume approved by HR");
  }
  if (blockingFlags.isBlocked) {
    steps.push("Resolve HR hold/restriction");
  }

  return steps;
}

function evaluateCareerReadinessFromData({ profile, resumes }) {
  const profileCompletion = evaluateProfileCompletion(profile);
  const cloudDrive = evaluateCloudDriveCleared(profile);
  const resumeApproval = evaluateResumeApproval(profile, resumes);
  const blockingFlags = evaluateBlockingFlags(profile);
  const legacyEligibilityAccess = hasLegacyEligibilityAccess(profile);

  const isPlacementEligible =
    cloudDrive.isCleared && profileCompletion.isComplete && resumeApproval.isApproved;
  const canGetOpportunities =
    !blockingFlags.isBlocked && (isPlacementEligible || legacyEligibilityAccess);
  const missingSteps = canGetOpportunities
    ? []
    : buildMissingSteps({
        cloudDrive,
        profileCompletion,
        resumeApproval,
        blockingFlags,
      });

  return {
    isPlacementEligible,
    canGetOpportunities,
    legacyEligibilityAccess,
    profileCompletion,
    cloudDrive,
    resumeApproval,
    blockingFlags,
    missingSteps,
  };
}

function toStudentReadinessView(evaluation) {
  const isBlocked = Boolean(evaluation?.blockingFlags?.isBlocked);
  const missingSteps = Array.isArray(evaluation?.missingSteps)
    ? evaluation.missingSteps.filter((step) => step !== "Resolve HR hold/restriction")
    : [];

  if (isBlocked) {
    missingSteps.push("Contact support team for profile review");
  }

  return {
    isPlacementEligible: Boolean(evaluation?.isPlacementEligible),
    canGetOpportunities: Boolean(evaluation?.canGetOpportunities),
    legacyEligibilityAccess: Boolean(evaluation?.legacyEligibilityAccess),
    profileCompletion: evaluation?.profileCompletion || {
      isComplete: false,
      percentage: 0,
      missingSteps: [],
    },
    cloudDrive: evaluation?.cloudDrive || { isCleared: false, matchedStatus: "" },
    resumeApproval: evaluation?.resumeApproval || {
      activeResumeId: null,
      activeResumeApprovalStatus: "PENDING",
      isApproved: false,
      hasActiveResume: false,
    },
    missingSteps,
  };
}

async function evaluateCareerReadinessByStudentId({ studentId, supabase }) {
  const db = supabase || getSupabaseAdmin();
  if (!db) {
    const err = new Error("Admin DB client not configured");
    err.status = 500;
    throw err;
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select(
      "id, role, full_name, email, phone, location, skills, experience_level, cloud_drive_status, drive_cleared_status, cloud_drive_status_history, internal_flags, active_resume_id, is_eligible, eligible_until",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (profileError) throw profileError;

  if (!profile) {
    const err = new Error("Student profile not found");
    err.status = 404;
    throw err;
  }

  const { data: resumes, error: resumeError } = await db
    .from("resumes")
    .select("id, user_id, approval_status, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false });
  if (resumeError) throw resumeError;

  const evaluation = evaluateCareerReadinessFromData({
    profile,
    resumes: resumes || [],
  });

  return {
    profile,
    resumes: resumes || [],
    evaluation,
  };
}

async function assertCareerReadinessForRealOpportunity({ studentId, supabase }) {
  const { evaluation } = await evaluateCareerReadinessByStudentId({ studentId, supabase });
  if (!evaluation.canGetOpportunities) {
    const studentView = toStudentReadinessView(evaluation);
    const err = new Error(
      `Not eligible for real opportunities. Pending: ${studentView.missingSteps.join(", ")}`,
    );
    err.status = 403;
    err.code = "CAREER_READINESS_BLOCKED";
    err.details = studentView;
    throw err;
  }
  return evaluation;
}

module.exports = {
  CLEARED_CLOUD_DRIVE_STATUSES,
  evaluateCareerReadinessFromData,
  evaluateCareerReadinessByStudentId,
  assertCareerReadinessForRealOpportunity,
  toStudentReadinessView,
};
