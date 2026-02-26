const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const optionalVerifyToken = require("../middleware/optionalVerifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const jobController = require("../controllers/jobController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Everyone can read
router.get(
  "/",
  optionalVerifyToken,
  cacheResponse({ ttlSeconds: 60 }),
  jobController.list,
);

// Admin only
router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/jobs",
    "/api/applications",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  jobController.create,
);
router.put(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/jobs",
    "/api/applications",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  jobController.update,
);
router.delete(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/jobs",
    "/api/applications",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  jobController.remove,
);

module.exports = router;
