const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const jobController = require("../controllers/jobController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Everyone can read
router.get("/", jobController.list);

// Admin only
router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  jobController.create,
);
router.put(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  jobController.update,
);
router.delete(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  jobController.remove,
);

module.exports = router;
