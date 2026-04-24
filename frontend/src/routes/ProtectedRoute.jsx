import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/common/Loader";
import { useAuth } from "../context/authStore";
import { ROLES } from "../utils/constants";
import { isStudentProfileComplete } from "../utils/profileChecks";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bgLight p-6">
        <Loader label="Checking session..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/home" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === ROLES.SUPER_ADMIN) {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    if (user.role === ROLES.ADMIN) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }

  const profileComplete = isStudentProfileComplete(profile, user);
  if (
    user.role === ROLES.STUDENT &&
    !profileComplete &&
    location.pathname !== "/complete-profile"
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}
