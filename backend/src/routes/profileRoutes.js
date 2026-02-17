const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const profileController = require("../controllers/profileController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/me", verifyToken, profileController.getMyProfile);
router.put("/me", verifyToken, profileController.upsertMyProfile);
router.post(
  "/photo",
  verifyToken,
  upload.single("file"),
  profileController.uploadPhoto,
);

module.exports = router;
