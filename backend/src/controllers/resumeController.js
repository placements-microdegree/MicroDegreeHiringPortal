const resumeService = require("../services/resumeService");
const profileService = require("../services/profileService");

async function upload(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }

    await profileService.ensureProfileRow({
      userId: req.user.id,
      jwt: req.user.jwt,
      email: req.user.email,
      role: req.user.role,
    });

    const existing = await resumeService.listResumesByUser(req.user.id);
    if (
      (existing.length || 0) + files.length >
      resumeService.MAX_RESUMES_PER_STUDENT
    ) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${resumeService.MAX_RESUMES_PER_STUDENT} resumes are allowed`,
      });
    }

    const uploaded = [];
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      const row = await resumeService.uploadResume({
        userId: req.user.id,
        jwt: req.user.jwt,
        file: f,
      });
      uploaded.push(row);
    }

    res.status(201).json({ success: true, resumes: uploaded });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, resumes });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await resumeService.deleteResume({ resumeId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  listMine,
  remove,
};
