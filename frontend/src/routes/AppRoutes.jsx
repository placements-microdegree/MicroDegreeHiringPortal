import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/authStore";
import { ROLES } from "../utils/constants";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import CompleteProfile from "../pages/auth/CompleteProfile";

import StudentDashboard from "../pages/student/StudentDashboard";
import JobListings from "../pages/student/JobListings";
import ApplicationStatus from "../pages/student/ApplicationStatus";
import HelpCenter from "../pages/student/HelpCenter";
import CareerGuide from "../pages/student/Careerguide";
import CloudDrive from "../pages/student/Clouddrive";
import ExternalJobs from "../pages/student/ExternalJobs";         // ← NEW

import AdminDashboard from "../pages/admin/AdminDashboard";
import PostJD from "../pages/admin/PostJD";
import ManageApplications from "../pages/admin/ManageApplications";
import PostExternalJob from "../pages/admin/PostExternalJob";      // ← NEW

import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import ManageHRAdmins from "../pages/superadmin/ManageHRAdmins";
import Students from "../pages/superadmin/Students";
import SuperAdminJobs from "../pages/superadmin/SuperAdminJobs";
import SuperAdminApplications from "../pages/superadmin/SuperAdminApplications";
import SuperAdminChecker from "../pages/superadmin/SuperAdminChecker";
import PageOpeningShimmer from "../components/common/PageOpeningShimmer";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.SUPER_ADMIN) return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)       return <Navigate to="/admin/dashboard"      replace />;
  return <Navigate to="/student/dashboard" replace />;
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Login />;
  if (user.role === ROLES.SUPER_ADMIN) return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)       return <Navigate to="/admin/dashboard"      replace />;
  return <Navigate to="/student/dashboard" replace />;
}

function SignupRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Signup />;
  if (user.role === ROLES.SUPER_ADMIN) return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)       return <Navigate to="/admin/dashboard"      replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<AuthRedirect />} />
      <Route path="/signup" element={<SignupRedirect />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]} />}>
        <Route path="/complete-profile" element={<CompleteProfile />} />
      </Route>

      {/* ── Student routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route element={<DashboardLayout role={ROLES.STUDENT} />}>
          <Route path="/student/dashboard"     element={<StudentDashboard />}  />
          <Route path="/student/jobs"          element={<JobListings />}       />
          <Route path="/student/applications"  element={<ApplicationStatus />} />
          <Route path="/student/help"          element={<HelpCenter />}        />
          <Route path="/student/career-guide"  element={<CareerGuide />}       />
          <Route path="/student/cloud-drive"   element={<CloudDrive />}        />
          <Route path="/student/external-jobs" element={<ExternalJobs />}      /> {/* ← NEW */}
        </Route>
      </Route>

      {/* ── Admin routes ─────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<DashboardLayout role={ROLES.ADMIN} />}>
          <Route path="/admin/dashboard"                  element={<AdminDashboard />}     />
          <Route path="/admin/post-jd"                    element={<PostJD />}             />
          <Route path="/admin/manage-applications"        element={<ManageApplications />} />
          <Route path="/admin/manage-applications/:jobId" element={<ManageApplications />} />
          <Route path="/admin/external-jobs"              element={<PostExternalJob />}    /> {/* ← NEW */}
        </Route>
      </Route>

      {/* ── Super Admin routes ───────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        <Route element={<DashboardLayout role={ROLES.SUPER_ADMIN} />}>
          <Route path="/superadmin/dashboard"          element={<SuperAdminDashboard />}    />
          <Route path="/superadmin/manage-hr"          element={<ManageHRAdmins />}         />
          <Route path="/superadmin/students"           element={<Students />}               />
          <Route path="/superadmin/jobs"               element={<SuperAdminJobs />}         />
          <Route path="/superadmin/applications"       element={<SuperAdminApplications />} />
          <Route path="/superadmin/applications/:jobId" element={<SuperAdminApplications />} />
          <Route path="/superadmin/checker"            element={<SuperAdminChecker />}      />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}