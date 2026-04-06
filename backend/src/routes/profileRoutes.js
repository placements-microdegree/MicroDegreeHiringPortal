const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const profileController = require("../controllers/profileController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/me",
  verifyToken,
  cacheResponse({ ttlSeconds: 30 }),
  profileController.getMyProfile,
);
router.put(
  "/me",
  verifyToken,
  invalidateApiCache([
    "/api/profile/me",
    "/api/admin/students",
    "/api/admin/analytics",
    "/api/applications/analytics/me",
  ]),
  profileController.upsertMyProfile,
);
router.post(
  "/photo",
  verifyToken,
  upload.single("file"),
  invalidateApiCache(["/api/profile/me", "/api/admin/students"]),
  profileController.uploadPhoto,
);

router.patch(
  "/me/email-subscription",
  verifyToken,
  invalidateApiCache(["/api/profile/me"]),
  profileController.updateMyEmailSubscription,
);

router.get(
  "/email-subscription/by-token",
  profileController.getEmailSubscriptionByToken,
);

router.post(
  "/email-subscription/by-token",
  profileController.updateEmailSubscriptionByToken,
);

module.exports = router;
