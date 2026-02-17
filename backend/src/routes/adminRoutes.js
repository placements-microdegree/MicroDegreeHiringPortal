const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const adminController = require("../controllers/adminController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Super admin only
router.use(
  verifyToken,
  authorizeRole([ROLES.SUPER_ADMIN]),
);

router.get("/students", adminController.listStudents);
router.get("/admins", adminController.listAdmins);
router.post("/promote", adminController.promote);
router.get("/analytics", adminController.analytics);

module.exports = router;
