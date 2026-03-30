// FILE: routes/externalJobRoutes.js

const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const externalJobController = require("../controllers/externalJobController");
const { ROLES } = require("../utils/constants");

const router = express.Router();
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// Public visitors — view active jobs from share links
router.get(
  "/public",
  cacheResponse({ ttlSeconds: 30 }),
  externalJobController.listPublicActive,
);

// Public visitors — track landing page open for virality analytics
router.post("/public/visit", externalJobController.trackPublicVisit);

// Public visitors — track apply-link click from shared links
router.post("/:id/click/public", externalJobController.trackPublicClick);

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

// Eligible students — track page visit on /student/external-jobs
router.post(
  "/visit",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/external-jobs/visit-analytics"]),
  externalJobController.trackVisit,
);

// Super admin — analytics for page visits by students
router.get(
  "/visit-analytics",
  verifyToken,
  authorizeRole([ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  externalJobController.visitAnalytics,
);

// Eligible students — track apply-link click
router.post(
  "/:id/click",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/external-jobs/all"]),
  externalJobController.trackClick,
);

// Eligible students — track share actions for virality analytics
router.post(
  "/:id/share",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  externalJobController.trackShare,
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
