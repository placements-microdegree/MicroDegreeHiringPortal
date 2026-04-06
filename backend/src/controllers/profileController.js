const profileService = require("../services/profileService");
const resumeService = require("../services/resumeService");
const { uploadProfilePhoto } = require("../services/profilePhotoService");
const emailSubscriptionService = require("../services/emailSubscriptionService");

function mapProfileRow(row, resumes = []) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    location: row.location,
    preferredLocation: row.preferred_location,
    skills: row.skills || [],
    experienceLevel: row.experience_level,
    experienceYears: row.experience_years,
    isCurrentlyWorking: row.is_currently_working,
    totalExperience: row.total_experience,
    currentCTC: row.current_ctc,
    expectedCTC: row.expected_ctc,
    profilePhotoUrl: row.profile_photo_url,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    isEligible: row.is_eligible,
    eligibleUntil: row.eligible_until,
    applicationQuota: row.application_quota,
    courseFee: row.course_fee,
    emailSubscribe: row.email_subscribe,
    resumes,
  };
}

async function getMyProfile(req, res, next) {
  try {
    const data = await profileService.getProfileByUserId({
      userId: req.user.id,
      jwt: req.user.jwt,
    });
    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, profile: mapProfileRow(data, resumes) });
  } catch (err) {
    next(err);
  }
}

async function upsertMyProfile(req, res, next) {
  try {
    const saved = await profileService.upsertProfile({
      userId: req.user.id,
      jwt: req.user.jwt,
      payload: {
        ...req.body,
        email: req.body.email || req.user.email,
        role: req.body.role || req.user.role,
      },
    });
    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, profile: mapProfileRow(saved, resumes) });
  } catch (err) {
    next(err);
  }
}

async function uploadPhoto(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { publicUrl } = await uploadProfilePhoto({
      userId: req.user.id,
      file,
      jwt: req.user.jwt,
    });

    // Persist URL to profile row for convenience.
    const saved = await profileService.upsertProfile({
      userId: req.user.id,
      jwt: req.user.jwt,
      payload: {
        ...req.body,
        profilePhotoUrl: publicUrl,
        email: req.user.email,
        role: req.user.role,
      },
    });

    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: req.user.id,
      jwt: req.user.jwt,
    });

    res.json({
      success: true,
      url: publicUrl,
      profile: mapProfileRow(saved, resumes),
    });
  } catch (err) {
    next(err);
  }
}

async function updateMyEmailSubscription(req, res, next) {
  try {
    const subscribed = Boolean(req.body?.emailSubscribe);
    const result = await emailSubscriptionService.setSubscriptionByUserId({
      userId: req.user.id,
      subscribe: subscribed,
    });
    res.json({ success: true, subscription: result });
  } catch (err) {
    next(err);
  }
}

async function getEmailSubscriptionByToken(req, res, next) {
  try {
    const token = String(req.query?.token || "").trim();
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing subscription token" });
    }

    const result = await emailSubscriptionService.getSubscriptionStateByToken(
      token,
    );
    res.json({ success: true, subscription: result });
  } catch (err) {
    next(err);
  }
}

async function updateEmailSubscriptionByToken(req, res, next) {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing subscription token" });
    }

    const subscribed = Boolean(req.body?.emailSubscribe);
    const result = await emailSubscriptionService.setSubscriptionByToken({
      token,
      subscribe: subscribed,
    });
    res.json({ success: true, subscription: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyProfile,
  upsertMyProfile,
  uploadPhoto,
  updateMyEmailSubscription,
  getEmailSubscriptionByToken,
  updateEmailSubscriptionByToken,
};
