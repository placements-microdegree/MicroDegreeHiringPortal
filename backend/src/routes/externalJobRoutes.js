// FILE: routes/externalJobRoutes.js

const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const externalJobController = require("../controllers/externalJobController");
const { ROLES } = require("../utils/constants");

const router = express.Router();
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// Eligible students — view active jobs
router.get(
  "/",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  cacheResponse({ ttlSeconds: 30 }),
  externalJobController.listActive,
);

// HR/admin — view all jobs (all statuses)  ← must be before /:id
router.get(
  "/all",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  cacheResponse({ ttlSeconds: 30 }),
  externalJobController.listAll,
);

// HR/admin — create
router.post(
  "/",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/external-jobs"]),
  externalJobController.create,
);

// HR/admin — bulk create from file mapping
router.post(
  "/bulk",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/external-jobs"]),
  externalJobController.bulkCreate,
);

// Eligible students — track apply-link click
router.post(
  "/:id/click",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/external-jobs/all"]),
  externalJobController.trackClick,
);

// HR/admin — update
router.put(
  "/:id",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/external-jobs"]),
  externalJobController.update,
);

// HR/admin — delete
router.delete(
  "/:id",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/external-jobs"]),
  externalJobController.remove,
);

module.exports = router;
