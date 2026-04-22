const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const dailySessionController = require("../controllers/dailySessionController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRole([ROLES.STUDENT, ROLES.ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  dailySessionController.listDailySessions,
);

router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/daily-sessions"]),
  dailySessionController.createDailySession,
);

router.put(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/daily-sessions"]),
  dailySessionController.updateDailySession,
);

router.patch(
  "/:id/status",
  verifyToken,
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/daily-sessions"]),
  dailySessionController.updateDailySessionStatus,
);

router.put(
  "/settings",
  verifyToken,
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/daily-sessions"]),
  dailySessionController.updateDailySessions,
);

module.exports = router;
