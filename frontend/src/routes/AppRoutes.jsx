import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import ExternalJobs from "../pages/student/ExternalJobs"; // ← NEW
import ReferJobOpening from "../pages/student/ReferJobOpening";
import ReferJobOpeningFollowUp from "../pages/student/ReferJobOpeningFollowUp";

import AdminDashboard from "../pages/admin/AdminDashboard";
import PostJD from "../pages/admin/PostJD";
import ManageApplications from "../pages/admin/ManageApplications";
import PostExternalJob from "../pages/admin/PostExternalJob"; // ← NEW
import PlacementMasterDashboard from "../pages/admin/PlacementMasterDashboard";
import InterviewMappedCandidates from "../pages/admin/InterviewMappedCandidates";
import ReferredData from "../pages/admin/ReferredData";
import CloudDriveAdmin from "../pages/admin/CloudDriveAdmin";

import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import ManageHRAdmins from "../pages/superadmin/ManageHRAdmins";
import Students from "../pages/superadmin/Students";
import Favourites from "../pages/superadmin/Favourites";
import SuperAdminJobs from "../pages/superadmin/SuperAdminJobs";
import SuperAdminApplications from "../pages/superadmin/SuperAdminApplications";
import SuperAdminChecker from "../pages/superadmin/SuperAdminChecker";
import SuperAdminExternalJobAnalytics from "../pages/superadmin/SuperAdminExternalJobAnalytics";
import SuperAdminResumeBuilderAnalytics from "../pages/superadmin/SuperAdminResumeBuilderAnalytics";
import SuperAdminExternalJobsVisitStudents from "../pages/superadmin/SuperAdminExternalJobsVisitStudents";
import PageOpeningShimmer from "../components/common/PageOpeningShimmer";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.SUPER_ADMIN)
    return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Login />;
  if (user.role === ROLES.SUPER_ADMIN)
    return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

function SignupRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;
  if (!user) return <Signup />;
  if (user.role === ROLES.SUPER_ADMIN)
    return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

function ExternalJobsShareEntry() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageOpeningShimmer />;

  const targetPath = `/student/external-jobs${location.search || ""}`;

  if (!user) {
    const redirect = encodeURIComponent(targetPath);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (user.role === ROLES.SUPER_ADMIN)
    return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === ROLES.ADMIN)
    return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to={targetPath} replace />;
}

export default function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <PageOpeningShimmer />;

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<AuthRedirect />} />
      <Route path="/signup" element={<SignupRedirect />} />
      <Route path="/external-jobs" element={<ExternalJobsShareEntry />} />

      <Route
        element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]} />}
      >
        <Route path="/complete-profile" element={<CompleteProfile />} />
      </Route>

      {/* ── Student routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route element={<DashboardLayout role={ROLES.STUDENT} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/jobs" element={<JobListings />} />
          <Route path="/student/applications" element={<ApplicationStatus />} />
          <Route path="/student/help" element={<HelpCenter />} />
          <Route path="/student/career-guide" element={<CareerGuide />} />
          <Route path="/student/cloud-drive" element={<CloudDrive />} />
          <Route
            path="/student/external-jobs"
            element={<ExternalJobs />}
          />{" "}
          {/* ← NEW */}
          <Route
            path="/student/refer-job-opening"
            element={<ReferJobOpening />}
          />
          <Route
            path="/student/refer-job-opening/follow-up/:referralId"
            element={<ReferJobOpeningFollowUp />}
          />
        </Route>
      </Route>

      {/* ── Admin routes ─────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<DashboardLayout role={ROLES.ADMIN} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/post-jd" element={<PostJD />} />
          <Route
            path="/admin/manage-applications"
            element={<ManageApplications />}
          />
          <Route
            path="/admin/manage-applications/:jobId"
            element={<ManageApplications />}
          />
          <Route path="/admin/external-jobs" element={<PostExternalJob />} />{" "}
          <Route path="/admin/cloud-drive" element={<CloudDriveAdmin />} />
          {/* ← NEW */}
          <Route path="/admin/referred-data" element={<ReferredData />} />
          <Route
            path="/admin/placement-status-pipeline/master-dashboard"
            element={<PlacementMasterDashboard />}
          />
          <Route
            path="/admin/placement-status-pipeline/interview-mapped-candidates"
            element={<InterviewMappedCandidates />}
          />
        </Route>
      </Route>

      {/* ── Super Admin routes ───────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        <Route element={<DashboardLayout role={ROLES.SUPER_ADMIN} />}>
          <Route
            path="/superadmin/dashboard"
            element={<SuperAdminDashboard />}
          />
          <Route path="/superadmin/manage-hr" element={<ManageHRAdmins />} />
          <Route path="/superadmin/students" element={<Students />} />
          <Route path="/superadmin/favourites" element={<Favourites />} />
          <Route path="/superadmin/jobs" element={<SuperAdminJobs />} />
          <Route
            path="/superadmin/applications"
            element={<SuperAdminApplications />}
          />
          <Route
            path="/superadmin/applications/:jobId"
            element={<SuperAdminApplications />}
          />
          <Route
            path="/superadmin/external-job-analytics"
            element={<SuperAdminExternalJobAnalytics />}
          />
          <Route
            path="/superadmin/external-jobs-visit-students"
            element={<SuperAdminExternalJobsVisitStudents />}
          />
          <Route
            path="/superadmin/resume-builder-analytics"
            element={<SuperAdminResumeBuilderAnalytics />}
          />
          <Route
            path="/superadmin/placement-status-pipeline/master-dashboard"
            element={<PlacementMasterDashboard />}
          />
          <Route
            path="/superadmin/placement-status-pipeline/interview-mapped-candidates"
            element={<InterviewMappedCandidates />}
          />
          <Route path="/superadmin/checker" element={<SuperAdminChecker />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
