const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const authorizeRole = require("../middleware/authorizeRole");
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
  resumeController.upload,
);

router.get(
  "/me",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  resumeController.listMine,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole([ROLES.STUDENT]),
  resumeController.remove,
);

module.exports = router;
