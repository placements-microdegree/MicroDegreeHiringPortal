const dailySessionService = require("../services/dailySessionService");
const joinSessionService = require("../services/joinSessionService");

async function listDailySessions(req, res, next) {
  try {
    const sessions = await dailySessionService.listDailySessions();
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
}

async function updateDailySessions(req, res, next) {
  try {
    const sessions = await dailySessionService.updateDailySessionsSettings(
      req.body || {},
    );
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
}

async function joinSession(req, res, next) {
  try {
    if (!req.user?.id || !req.user?.email) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const result = await joinSessionService.createJoinSessionLink({
      userId: req.user.id,
      jwt: req.user.jwt,
      email: req.user.email,
      fallbackName: req.user.raw?.user_metadata?.full_name,
    });

    res.json({
      success: true,
      role: result.role,
      join_url: result.joinUrl,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDailySessions,
  updateDailySessions,
  joinSession,
};
