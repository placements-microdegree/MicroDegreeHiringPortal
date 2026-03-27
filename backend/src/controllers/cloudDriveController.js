const cloudDriveService = require("../services/cloudDriveService");

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseYesNoBoolean(value) {
  if (value === true || value === "Yes" || value === "yes") return true;
  if (value === false || value === "No" || value === "no") return false;
  return null;
}

function parseNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getNextDrive(req, res, next) {
  try {
    const nextDrive = await cloudDriveService.getNextDrive();
    let registered = false;
    if (req.user?.id && nextDrive) {
      const reg = await cloudDriveService.findRegistration({
        profileId: req.user.id,
        driveId: nextDrive.id,
      });
      registered = Boolean(reg);
    }
    res.json({ success: true, nextDrive, registered });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const profileId = req.user?.id;
    const body = req.body || {};
    const nextDrive = await cloudDriveService.getNextDrive();
    const selectedDriveId = body.drive_id || nextDrive?.id;

    if (!selectedDriveId) {
      return res.status(400).json({
        success: false,
        message: "No active cloud drive is available for registration.",
      });
    }

    if (profileId) {
      const existing = await cloudDriveService.findRegistration({
        profileId,
        driveId: selectedDriveId,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You are already registered for this drive.",
        });
      }
    }

    const relocationPreference = body.relocation_preference || "";
    const isReadyToRelocate =
      relocationPreference &&
      relocationPreference.toLowerCase() !== "i am not ready to relocate";
    const highestEducation = body.highest_education || null;
    const highestEducationOther = body.highest_education_other || null;
    const finalHighestEducation =
      highestEducation === "Other" && highestEducationOther
        ? highestEducationOther
        : highestEducation;
    const awsCertifications = normalizeStringArray(body.aws_certifications);
    const awsTools = normalizeStringArray(body.aws_tools);
    const devopsTools = normalizeStringArray(body.devops_tools);
    const devopsCertifications = normalizeStringArray(body.devops_certifications);
    const track = body.track || null;
    const currentStatus = body.current_status || body.status || null;
    const relevantExperience =
      body.relevant_experience || body.aws_experience || null;
    const transitionToCloudDevOps = parseYesNoBoolean(
      body.transitioning_to_cloud_devops,
    );
    const awsHandsOn = parseYesNoBoolean(body.has_aws_hands_on);
    const devopsHandsOn = parseYesNoBoolean(body.has_devops_hands_on);
    const currentlyWorking = parseYesNoBoolean(body.currently_working);
    const hasAwsCert =
      body.aws_cert === true ||
      body.aws_cert === "Yes" ||
      awsCertifications.some((item) => item !== "None");
    const hasDevopsCert =
      body.devops_cert === true ||
      body.devops_cert === "Yes" ||
      devopsCertifications.some((item) => item !== "None");

    const backendTags = body.backend_tags && typeof body.backend_tags === "object"
      ? body.backend_tags
      : {
          track: track === "AWS Cloud Track" ? "aws" : track === "DevOps Track" ? "devops" : null,
          status:
            currentStatus === "IT Professional"
              ? "it"
              : currentStatus === "Non-IT -> Transitioning to IT"
                ? "non-it"
                : currentStatus === "Fresher"
                  ? "fresher"
                  : null,
          total_experience: body.total_experience || null,
          relevant_experience: relevantExperience,
          job_intent: body.job_intent || null,
        };

    // associate profile if present
    const reg = {
      drive_id: selectedDriveId,
      profile_id: profileId || null,
      full_name: body.full_name || body.name || null,
      email: body.email || null,
      phone: body.phone || null,
      current_location: body.current_location || null,
      relocation_preference: relocationPreference || null,
      ready_to_relocate: Boolean(isReadyToRelocate),
      highest_education: finalHighestEducation,
      highest_education_other: highestEducationOther,
      total_experience: body.total_experience || null,
      aws_experience: relevantExperience,
      domain: body.domain || currentStatus,
      aws_cert: hasAwsCert,
      devops_cert: hasDevopsCert,
      source: body.source || null,
      current_status: currentStatus,
      relevant_experience: relevantExperience,
      current_last_role: body.current_last_role || null,
      transitioning_to_cloud_devops: transitionToCloudDevOps,
      non_it_field: body.non_it_field || null,
      graduation_year: parseNumberOrNull(body.graduation_year),
      track: track,
      has_aws_hands_on: awsHandsOn,
      aws_certifications: awsCertifications,
      aws_tools: awsTools,
      aws_global_certification_details:
        body.aws_global_certification_details || null,
      has_devops_hands_on: devopsHandsOn,
      devops_tools: devopsTools,
      devops_certifications: devopsCertifications,
      devops_global_certification_details:
        body.devops_global_certification_details || null,
      job_intent: body.job_intent || null,
      current_ctc: parseNumberOrNull(body.current_ctc),
      expected_ctc: parseNumberOrNull(body.expected_ctc),
      notice_period: body.notice_period || null,
      currently_working: currentlyWorking,
      commitment_full_drive: Boolean(body.commitment_full_drive),
      commitment_serious_roles: Boolean(body.commitment_serious_roles),
      commitment_selection_performance: Boolean(body.commitment_selection_performance),
      backend_tags: backendTags,
      status: "Registered",
    };

    const created = await cloudDriveService.createRegistration(reg);
    res.json({ success: true, registration: created });
  } catch (err) {
    next(err);
  }
}

async function listRegistrations(req, res, next) {
  try {
    const { driveId, email, full_name } = req.query || {};
    const filters = {};
    if (email) filters.email = email;
    if (full_name) filters.full_name = full_name;
    const regs = await cloudDriveService.listRegistrations({ driveId, filters });
    res.json({ success: true, registrations: regs });
  } catch (err) {
    next(err);
  }
}

async function listMyRegistrations(req, res, next) {
  try {
    const profileId = req.user?.id;
    if (!profileId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const registrations = await cloudDriveService.listRegistrationsForProfile(profileId);
    res.json({ success: true, registrations });
  } catch (err) {
    next(err);
  }
}

async function upsertDrive(req, res, next) {
  try {
    const drive = req.body || {};
    const normalizedDrive = {
      ...drive,
      title: drive.title || "Career Assistance",
      drive_date: drive.drive_date || null,
      drive_time: drive.drive_time || null,
      registration_close_at: drive.registration_close_at || null,
      zoom_link: drive.zoom_link || null,
      passcode: drive.passcode || null,
      notes: drive.notes || null,
      is_active: Boolean(drive.is_active),
    };
    const saved = await cloudDriveService.upsertDrive(normalizedDrive);
    res.json({ success: true, drive: saved });
  } catch (err) {
    next(err);
  }
}

async function listDrives(req, res, next) {
  try {
    const drives = await cloudDriveService.listDrives();
    res.json({ success: true, drives });
  } catch (err) {
    next(err);
  }
}

async function updateRegistration(req, res, next) {
  try {
    const { id } = req.params || {};
    const changes = req.body || {};
    const updated = await cloudDriveService.updateRegistration(id, changes);
    res.json({ success: true, registration: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNextDrive,
  register,
  listRegistrations,
  listMyRegistrations,
  upsertDrive,
  listDrives,
  updateRegistration,
};
