const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const dailySessionController = require("../controllers/dailySessionController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.STUDENT, ROLES.ADMIN]),
  dailySessionController.joinSession,
);

module.exports = router;
