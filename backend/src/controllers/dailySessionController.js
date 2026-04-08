const dailySessionService = require("../services/dailySessionService");

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

module.exports = {
  listDailySessions,
  updateDailySessions,
};
