// FILE: src/components/student/Sidebar.jsx

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiX,
  FiClipboard,
  FiBookOpen,
  FiGrid,
  FiHelpCircle,
  FiLogOut,
  FiCloud,
  FiBriefcase,
} from "react-icons/fi";
import Button from "../common/Button";
import { ROLES } from "../../utils/constants";
import { useAuth } from "../../context/authStore";
import { listActiveExternalJobs } from "../../services/externalJobService";

const linkBase =
  "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition";

export default function Sidebar({ role, isOpen = false, onClose }) {
  const { logout, profile } = useAuth();
  const isStudent = role === ROLES.STUDENT;
  const isEligible = profile?.isEligible === true;
  const [externalJobsCount, setExternalJobsCount] = useState(0);

  useEffect(() => {
    if (!isStudent || !isEligible) {
      setExternalJobsCount(0);
      return;
    }

    let mounted = true;
    const fetchCount = async () => {
      try {
        const jobs = await listActiveExternalJobs();
        if (mounted)
          setExternalJobsCount(Array.isArray(jobs) ? jobs.length : 0);
      } catch {
        if (mounted) setExternalJobsCount(0);
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isStudent, isEligible]);

  let links = [];
  if (role === ROLES.SUPER_ADMIN) {
    links = [
      { to: "/superadmin/dashboard", label: "Dashboard" },
      { to: "/superadmin/manage-hr", label: "Manage HR Admins" },
      { to: "/superadmin/students", label: "View Students" },
      { to: "/superadmin/jobs", label: "View Jobs" },
      { to: "/superadmin/applications", label: "Applications" },
      {
        to: "/superadmin/external-job-analytics",
        label: "External Job Analytics",
      },
      { to: "/superadmin/checker", label: "Checker" },
    ];
  } else if (role === ROLES.ADMIN) {
    links = [
      { to: "/admin/dashboard", label: "Dashboard" },
      { to: "/admin/post-jd", label: "Post JD" },
      { to: "/admin/manage-applications", label: "Manage Applications" },
      {
        to: "/admin/external-jobs",
        label: "External Jobs",
        icon: FiBriefcase,
      },
    ];
  } else {
    links = [
      { to: "/student/dashboard", label: "Dashboard", icon: FiGrid },
      { to: "/student/jobs", label: "Jobs (JD)", icon: FiBookOpen },
      {
        to: "/student/applications",
        label: "Application Status",
        icon: FiClipboard,
      },
      ...(isEligible
        ? [
            {
              to: "/student/external-jobs",
              label: "External Jobs",
              icon: FiBriefcase,
            },
            {
              to: "/student/career-guide",
              label: "Career Assistance Guide",
              icon: FiBookOpen,
            },
            {
              to: "/student/cloud-drive",
              label: "Cloud Drive",
              icon: FiCloud,
            },
          ]
        : []),
      { to: "/student/help", label: "Help Center", icon: FiHelpCircle },
    ];
  }

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white p-4 transition-transform
          md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:overflow-y-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="MicroDegree" className="h-11 w-11" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                MicroDegree
              </div>
              <div className="text-xs text-slate-500">
                {isStudent ? "Student Portal" : "Placement Portal"}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="mt-6 space-y-1.5">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `${linkBase} ${
                    isActive
                      ? "border border-primary/20 bg-primary/10 text-primary shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && (
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-500"}`}
                      />
                    )}
                    <span>{l.label}</span>
                    {isStudent &&
                      l.to === "/student/external-jobs" &&
                      externalJobsCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          {externalJobsCount > 99 ? "99+" : externalJobsCount}
                        </span>
                      )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-6">
          <Button variant="outline" className="w-full gap-2" onClick={logout}>
            <FiLogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
