const { ROLES } = require("../utils/constants");

function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role)
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    if (role === ROLES.SUPER_ADMIN) return next();
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
}

module.exports = authorizeRole;
