const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const adminController = require("../controllers/adminController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

// Super admin only
router.use(verifyToken, authorizeRole([ROLES.SUPER_ADMIN]));

router.get(
  "/students",
  cacheResponse({ ttlSeconds: 45 }),
  adminController.listStudents,
);
router.get(
  "/admins",
  cacheResponse({ ttlSeconds: 45 }),
  adminController.listAdmins,
);
router.post(
  "/promote",
  invalidateApiCache([
    "/api/admin/students",
    "/api/admin/admins",
    "/api/admin/analytics",
  ]),
  adminController.promote,
);
router.get(
  "/analytics",
  cacheResponse({ ttlSeconds: 20 }),
  adminController.analytics,
);
router.get(
  "/checker",
  cacheResponse({ ttlSeconds: 15 }),
  adminController.checker,
);

module.exports = router;
