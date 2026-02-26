const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const applicationController = require("../controllers/applicationController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Student
router.post(
  "/apply",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache([
    "/api/applications",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  applicationController.apply,
);
router.get(
  "/me",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  cacheResponse({ ttlSeconds: 30 }),
  applicationController.myApplications,
);
router.get(
  "/analytics/me",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  cacheResponse({ ttlSeconds: 30 }),
  applicationController.myAnalytics,
);

// Admin
router.get(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 30 }),
  applicationController.allApplications,
);
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/applications",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  applicationController.updateStatus,
);

module.exports = router;
