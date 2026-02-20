const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const jobController = require("../controllers/jobController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Everyone can read
router.get("/", cacheResponse({ ttlSeconds: 60 }), jobController.list);

// Admin only
router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/jobs",
    "/api/applications",
    "/api/admin/analytics",
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
  ]),
  jobController.remove,
);

module.exports = router;
