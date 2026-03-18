const adminService = require("../services/adminService");
const { ROLES } = require("../utils/constants");

async function listStudents(req, res, next) {
  try {
    const students = await adminService.listStudentsWithLatestApplication();
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await adminService.listProfiles({ role: ROLES.ADMIN });
    res.json({ success: true, admins });
  } catch (err) {
    next(err);
  }
}

async function listFavoriteStudents(req, res, next) {
  try {
    const favoriteStudentIds = await adminService.listFavoriteStudentIds({
      superadminId: req.user?.id,
    });
    res.json({ success: true, favoriteStudentIds });
  } catch (err) {
    next(err);
  }
}

async function addFavoriteStudents(req, res, next) {
  try {
    const { studentIds } = req.body || {};
    const favoriteStudentIds = await adminService.addFavoriteStudents({
      superadminId: req.user?.id,
      studentIds,
    });
    res.json({ success: true, favoriteStudentIds });
  } catch (err) {
    next(err);
  }
}

async function removeFavoriteStudents(req, res, next) {
  try {
    const { studentIds } = req.body || {};
    const favoriteStudentIds = await adminService.removeFavoriteStudents({
      superadminId: req.user?.id,
      studentIds,
    });
    res.json({ success: true, favoriteStudentIds });
  } catch (err) {
    next(err);
  }
}

async function promote(req, res, next) {
  try {
    const { email, role } = req.body || {};
    const result = await adminService.promoteByEmail({
      email,
      targetRole: role || ROLES.ADMIN,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const stats = await adminService.analytics();
    res.json({ success: true, analytics: stats });
  } catch (err) {
    next(err);
  }
}

async function checker(req, res, next) {
  try {
    const { type, query } = req.query || {};
    const result = await adminService.findStudentWithApplications({
      type,
      query,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listStudents,
  listAdmins,
  listFavoriteStudents,
  addFavoriteStudents,
  removeFavoriteStudents,
  promote,
  analytics,
  checker,
};
