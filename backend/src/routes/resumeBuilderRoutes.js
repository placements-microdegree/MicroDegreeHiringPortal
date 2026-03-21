const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const resumeBuilderController = require("../controllers/resumeBuilderController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.post(
  "/click",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/resume-builder/analytics"]),
  resumeBuilderController.trackClick,
);

router.get(
  "/analytics",
  verifyToken,
  authorizeRole([ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  resumeBuilderController.analytics,
);

module.exports = router;
