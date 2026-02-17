const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const applicationController = require("../controllers/applicationController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Student
router.post(
  "/apply",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  applicationController.apply,
);
router.get(
  "/me",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  applicationController.myApplications,
);

// Admin
router.get(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  applicationController.allApplications,
);
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  applicationController.updateStatus,
);

module.exports = router;
