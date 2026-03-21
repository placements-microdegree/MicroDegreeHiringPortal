const resumeBuilderService = require("../services/resumeBuilderService");

async function trackClick(req, res, next) {
  try {
    const result = await resumeBuilderService.trackResumeBuilderClick({
      jwt: req.user.jwt,
      studentId: req.user.id,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const data = await resumeBuilderService.getResumeBuilderAnalytics({
      jwt: req.user.jwt,
    });

    res.json({
      success: true,
      analytics: data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  trackClick,
  analytics,
};
