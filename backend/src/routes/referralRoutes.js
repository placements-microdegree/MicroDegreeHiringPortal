const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const referralController = require("../controllers/referralController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/referrals/admin/list"]),
  referralController.createStepOne,
);

router.patch(
  "/:id/follow-up",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/referrals/admin/list"]),
  referralController.submitFollowUp,
);

router.get(
  "/admin/list",
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  referralController.listForAdmin,
);

module.exports = router;
