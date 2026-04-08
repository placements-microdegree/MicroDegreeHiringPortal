const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const adminController = require("../controllers/adminController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/students",
  authorizeRole([ROLES.ADMIN]),
  cacheResponse({ ttlSeconds: 45 }),
  adminController.listStudents,
);
router.put(
  "/students/:studentId/cloud-drive-profile",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/admin/students"]),
  adminController.updateStudentCloudDriveProfile,
);
router.get(
  "/favorites/students",
  authorizeRole([ROLES.ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  adminController.listFavoriteStudents,
);
router.post(
  "/favorites/students",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/admin/favorites/students"]),
  adminController.addFavoriteStudents,
);
router.delete(
  "/favorites/students",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/admin/favorites/students"]),
  adminController.removeFavoriteStudents,
);
router.get(
  "/favorites/playlists",
  authorizeRole([ROLES.ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  adminController.listFavoritePlaylists,
);
router.post(
  "/favorites/playlists",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache([
    "/api/admin/favorites/playlists",
    "/api/admin/favorites/students",
  ]),
  adminController.createFavoritePlaylist,
);
router.post(
  "/favorites/playlists/:playlistId/students",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/admin/favorites/playlists"]),
  adminController.addStudentsToFavoritePlaylist,
);
router.delete(
  "/favorites/playlists/:playlistId",
  authorizeRole([ROLES.ADMIN]),
  invalidateApiCache(["/api/admin/favorites/playlists"]),
  adminController.deleteFavoritePlaylist,
);
router.get(
  "/admins",
  authorizeRole([ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 45 }),
  adminController.listAdmins,
);
router.post(
  "/promote",
  authorizeRole([ROLES.SUPER_ADMIN]),
  invalidateApiCache([
    "/api/admin/students",
    "/api/admin/admins",
    "/api/admin/analytics",
  ]),
  adminController.promote,
);
router.get(
  "/analytics",
  authorizeRole([ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 20 }),
  adminController.analytics,
);
router.get(
  "/checker",
  authorizeRole([ROLES.SUPER_ADMIN]),
  cacheResponse({ ttlSeconds: 15 }),
  adminController.checker,
);

module.exports = router;
