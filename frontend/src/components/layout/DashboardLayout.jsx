import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import Navbar from "./Navbar";
import ProfileDrawer from "./ProfileDrawer";
import Sidebar from "./Sidebar";
import { ROLES } from "../../utils/constants";
import { calculateProfileCompletion } from "../../utils/calculateProfileCompletion";

export default function DashboardLayout({ role }) {
  const { profile, updateProfile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const title = useMemo(() => {
    if (role === ROLES.SUPER_ADMIN) {
      if (location.pathname.includes("manage-hr")) return "Manage HR Admins";
      if (location.pathname.includes("students")) return "Students";
      if (location.pathname.includes("jobs")) return "Jobs";
      if (location.pathname.includes("applications")) return "Applications";
      return "Super Admin Dashboard";
    }
    if (role === ROLES.ADMIN) {
      if (location.pathname.includes("post-jd")) return "Post JD";
      if (location.pathname.includes("manage-applications"))
        return "Manage Applications";
      return "Admin Dashboard";
    }
    if (location.pathname.includes("/student/jobs")) return "Job Listings";
    if (location.pathname.includes("/student/applications"))
      return "Application Status";
    if (location.pathname.includes("/student/help")) return "Help Center";
    return "Student Dashboard";
  }, [location.pathname, role]);

  const showProfile = role === ROLES.STUDENT;
  const completionPercent = useMemo(() => {
    if (!showProfile) return null;
    return calculateProfileCompletion(profile);
  }, [profile, showProfile]);

  return (
    <div className="min-h-screen bg-bgLight">
      <div className="flex">
        <Sidebar
          role={role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar
            title={title}
            profilePhotoUrl={profile?.profilePhotoUrl || ""}
            onProfileClick={() => setDrawerOpen(true)}
            onMenuClick={() => setSidebarOpen((prev) => !prev)}
            showProfile={showProfile}
            completionPercent={completionPercent}
          />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {showProfile ? (
        <ProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          profile={profile}
          onSave={updateProfile}
        />
      ) : null}
    </div>
  );
}
