const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
const { cacheResponse, invalidateApiCache } = require("../middleware/apiCache");
const resumeController = require("../controllers/resumeController");
const { ROLES } = require("../utils/constants");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/upload",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  upload.array("files", 5),
  invalidateApiCache(["/api/resumes/me", "/api/profile/me"]),
  resumeController.upload,
);

router.get(
  "/me",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  cacheResponse({ ttlSeconds: 30 }),
  resumeController.listMine,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  invalidateApiCache(["/api/resumes/me", "/api/profile/me"]),
  resumeController.remove,
);

module.exports = router;
