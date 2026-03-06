// FILE: routes/applicationRoutes.js

const express    = require("express");
const verifyToken      = require("../middleware/verifyToken");
const authorizeRole    = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const applicationController = require("../controllers/applicationController");
const { ROLES } = require("../utils/constants");

const router = express.Router();
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// ── Student routes ────────────────────────────────────────────────────────────
router.post(
  "/apply",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/applications"]),
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

// ── Admin routes — ALL static paths BEFORE /:id ───────────────────────────────
router.get(
  "/",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  cacheResponse({ ttlSeconds: 30 }),
  applicationController.allApplications,
);

// Search students by name / email / phone
router.get(
  "/search-students",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  applicationController.searchStudents,
);

// Fetch a student's profile (for pre-filling apply-on-behalf form)
router.get(
  "/student-profile/:studentId",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  applicationController.getStudentProfile,
);

// Fetch a student's resumes (for resume selector in apply-on-behalf form)
router.get(
  "/student-resumes/:studentId",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  applicationController.getStudentResumes,
);

// HR applies on behalf of a student
router.post(
  "/apply-on-behalf",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/applications"]),
  applicationController.applyOnBehalf,
);

// ── Param routes (/:id) — MUST be last ───────────────────────────────────────
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  invalidateApiCache(["/api/applications"]),
  applicationController.updateStatus,
);
router.patch(
  "/:id/comment",
  verifyToken,
  authorizeRole(ADMIN_ROLES),
  applicationController.updateComment,
);

module.exports = router;