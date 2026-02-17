const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/google/start", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

router.get("/me", verifyToken, authController.me);

module.exports = router;
