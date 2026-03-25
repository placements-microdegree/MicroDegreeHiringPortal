const cloudDriveService = require("../services/cloudDriveService");

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
      highest_education: body.highest_education || null,
      total_experience: body.total_experience || null,
      aws_experience: body.aws_experience || null,
      domain: body.domain || null,
      aws_cert: body.aws_cert === true || body.aws_cert === "Yes",
      devops_cert: body.devops_cert === true || body.devops_cert === "Yes",
      source: body.source || null,
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
  upsertDrive,
  listDrives,
  updateRegistration,
};
