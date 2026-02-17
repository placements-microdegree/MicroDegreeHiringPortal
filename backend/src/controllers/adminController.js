const adminService = require("../services/adminService");
const { ROLES } = require("../utils/constants");

async function listStudents(req, res, next) {
  try {
    const students = await adminService.listProfiles({ role: ROLES.STUDENT });
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

module.exports = {
  listStudents,
  listAdmins,
  promote,
  analytics,
};
