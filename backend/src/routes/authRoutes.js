const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const optionalVerifyToken = require("../middleware/optionalVerifyToken");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.get("/google/start", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

router.get("/me", verifyToken, authController.me);
router.get("/session", optionalVerifyToken, authController.session);

module.exports = router;
