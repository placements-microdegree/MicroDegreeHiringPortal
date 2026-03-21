const express = require('express');
const optionalVerifyToken = require('../middleware/optionalVerifyToken');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const cloudDriveController = require('../controllers/cloudDriveController');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// public next drive info (optional user)
router.get('/next', optionalVerifyToken, cloudDriveController.getNextDrive);

// register (student must be logged in)
router.post('/register', verifyToken, cloudDriveController.register);

// admin endpoints
router.get(
  '/admin/registrations',
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cloudDriveController.listRegistrations,
);

router.post(
  '/admin/drive',
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cloudDriveController.upsertDrive,
);

router.get(
  '/admin/drives',
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cloudDriveController.listDrives,
);

router.put(
  '/admin/registrations/:id',
  verifyToken,
  authorizeRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  cloudDriveController.updateRegistration,
);

module.exports = router;
