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

async function createDailySession(req, res, next) {
  try {
    const session = await dailySessionService.createDailySession(
      req.body || {},
      {
        updatedBy: req.user?.id,
      },
    );

    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
}

async function updateDailySession(req, res, next) {
  try {
    const session = await dailySessionService.updateDailySession(
      req.params?.id,
      req.body || {},
      {
        updatedBy: req.user?.id,
      },
    );

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
}

async function updateDailySessionStatus(req, res, next) {
  try {
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") {
      const err = new Error("enabled boolean is required");
      err.status = 400;
      throw err;
    }

    const session = await dailySessionService.updateDailySessionStatus(
      req.params?.id,
      enabled,
      {
        updatedBy: req.user?.id,
      },
    );

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
}

async function updateDailySessions(req, res, next) {
  try {
    const sessions = await dailySessionService.updateDailySessionsSettings(
      req.body || {},
      {
        updatedBy: req.user?.id,
      },
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

    const requestedSessionId = String(req.body?.sessionId || "").trim();
    let meetingId = "";
    let canJoin = true;
    let infoMessage = "";

    if (requestedSessionId) {
      const session =
        await dailySessionService.getDailySessionById(requestedSessionId);

      if (!session) {
        return res
          .status(404)
          .json({ success: false, message: "Session not found" });
      }

      if (session.enabled !== true) {
        return res
          .status(403)
          .json({ success: false, message: "Session is currently disabled" });
      }

      if (String(session.joinMode || "").trim() !== "api") {
        return res.status(400).json({
          success: false,
          message: "This session does not support API registration",
        });
      }

      meetingId = String(session.meetingId || "").trim();

      const joinAvailability = dailySessionService.getSessionJoinAvailability(
        session,
        new Date(),
      );
      canJoin = joinAvailability.canJoin === true;
      infoMessage = String(joinAvailability.message || "").trim();
    }

    const result = await joinSessionService.createJoinSessionLink({
      userId: req.user.id,
      jwt: req.user.jwt,
      email: req.user.email,
      fallbackName: req.user.raw?.user_metadata?.full_name,
      meetingId,
    });

    if (!canJoin) {
      return res.json({
        success: true,
        role: result.role,
        registered: true,
        can_join: false,
        message:
          infoMessage ||
          "Registration successful. Join will be available shortly.",
      });
    }

    res.json({
      success: true,
      role: result.role,
      registered: true,
      can_join: true,
      join_url: result.joinUrl,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDailySessions,
  createDailySession,
  updateDailySession,
  updateDailySessionStatus,
  updateDailySessions,
  joinSession,
};
