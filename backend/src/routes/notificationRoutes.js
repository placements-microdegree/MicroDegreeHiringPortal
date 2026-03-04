const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const notificationController = require("../controllers/notificationController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  notificationController.myNotifications,
);

router.patch(
  "/:id/read",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  notificationController.markRead,
);

module.exports = router;
