const applicationService = require("../services/applicationService");

async function apply(req, res, next) {
  try {
    const application = await applicationService.createApplication({
      jwt: req.user.jwt,
      payload: {
        studentId: req.user.id,
        ...req.body,
        jobId: req.body.jobId,
        status: "Applied",
      },
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    next(err);
  }
}

async function myApplications(req, res, next) {
  try {
    const applications = await applicationService.listApplicationsByStudent({
      studentId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) {
    next(err);
  }
}

async function myAnalytics(req, res, next) {
  try {
    const analytics = await applicationService.getStudentAnalytics({
      studentId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
}

async function allApplications(req, res, next) {
  try {
    const applications = await applicationService.listAllApplications({
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const updated = await applicationService.updateApplicationStatus({
      applicationId: req.params.id,
      status: req.body.status,
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true, application: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  myApplications,
  myAnalytics,
  allApplications,
  updateStatus,
};
