// FILE: src/components/student/Sidebar.jsx

import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import {
  FiX,
  FiClipboard,
  FiBookOpen,
  FiGrid,
  FiHelpCircle,
  FiLogOut,
  FiCloud,
  FiBriefcase,
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiSend,
  FiUsers,
  FiStar,
  FiCalendar,
} from "react-icons/fi";
import Button from "../common/Button";
import { ROLES } from "../../utils/constants";
import { useAuth } from "../../context/authStore";
import { listActiveExternalJobs } from "../../services/externalJobService";
import { listReferredDataForAdmin } from "../../services/referralService";
import {
  redirectToResumeBuilderWithSession,
  trackResumeBuilderClick,
} from "../../services/resumeBuilderService";

const linkBase =
  "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition";

export default function Sidebar({ role, isOpen = false, onClose }) {
  const { logout } = useAuth();
  const location = useLocation();
  const isStudent = role === ROLES.STUDENT;
  const isAdmin = role === ROLES.ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const [externalJobsCount, setExternalJobsCount] = useState(0);
  const [referredDataCount, setReferredDataCount] = useState(0);
  const isPlacementSectionActive = location.pathname.includes(
    "/placement-status-pipeline",
  );
  const [placementSectionOpen, setPlacementSectionOpen] = useState(
    isPlacementSectionActive,
  );

  useEffect(() => {
    if (isPlacementSectionActive) {
      setPlacementSectionOpen(true);
    }
  }, [isPlacementSectionActive]);

  useEffect(() => {
    if (!isStudent) {
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
  }, [isStudent]);

  useEffect(() => {
    if (!isAdmin) {
      setReferredDataCount(0);
      return;
    }

    let mounted = true;
    const fetchCount = async () => {
      try {
        const referrals = await listReferredDataForAdmin();
        if (mounted) {
          setReferredDataCount(Array.isArray(referrals) ? referrals.length : 0);
        }
      } catch {
        if (mounted) setReferredDataCount(0);
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isAdmin]);

  function handleResumeBuilderClick(event) {
    event?.preventDefault();
    onClose?.();
    void trackResumeBuilderClick().catch(() => {});
    void redirectToResumeBuilderWithSession();
  }

  let links = [];
  if (role === ROLES.SUPER_ADMIN) {
    links = [
      { to: "/superadmin/dashboard", label: "Dashboard", icon: FiGrid },
      {
        to: "/superadmin/manage-hr",
        label: "Manage HR Admins",
        icon: FiUsers,
      },
      { to: "/superadmin/students", label: "View Students", icon: FiUsers },
      { to: "/superadmin/favourites", label: "Favourites", icon: FiStar },
      { to: "/superadmin/playlist", label: "Playlist", icon: FiBookOpen },
      { to: "/superadmin/jobs", label: "View Jobs", icon: FiBriefcase },
      {
        to: "/superadmin/applications",
        label: "Applications",
        icon: FiClipboard,
      },
      {
        to: "/superadmin/external-job-analytics",
        label: "External Job Analytics",
        icon: FiBriefcase,
      },
      {
        to: "/superadmin/external-jobs-visit-students",
        label: "External Jobs Visit Students",
        icon: FiUsers,
      },
      {
        to: "/superadmin/resume-builder-analytics",
        label: "Resume Builder Analytics",
        icon: FiFileText,
      },
      { to: "/superadmin/checker", label: "Checker", icon: FiHelpCircle },
    ];
  } else if (role === ROLES.ADMIN) {
    links = [
      { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
      {
        to: "/admin/manage-applications",
        label: "Manage Applications",
        icon: FiClipboard,
      },
      { to: "/admin/post-jd", label: "Post JD", icon: FiFileText },
      { to: "/admin/students", label: "View Students", icon: FiUsers },
      { to: "/admin/favourites", label: "Favourites", icon: FiStar },
      { to: "/admin/playlist", label: "Playlist", icon: FiBookOpen },
      { to: "/admin/cloud-drive", label: "Cloud Drive", icon: FiCloud },
      {
        to: "/admin/daily-session-setting",
        label: "Daily Session Setting",
        icon: FiCalendar,
      },
      {
        to: "/admin/external-jobs",
        label: "External Jobs",
        icon: FiBriefcase,
      },
      {
        to: "/admin/referred-data",
        label: "Referred Data",
        icon: FiSend,
      },
    ];
  } else {
    links = [
      { to: "/student/dashboard", label: "Overview", icon: FiGrid },
      {
        to: "/student/external-jobs",
        label: "Job Feed",
        icon: FiBriefcase,
      },
      { to: "/student/jobs", label: "Premium Jobs", icon: FiBookOpen },
      {
        to: "/student/daily-sessions",
        label: "Interview Prep Session",
        icon: FiCalendar,
      },
      {
        to: "/student/applications",
        label: "My Applications",
        icon: FiClipboard,
      },
      {
        to: "/student/cloud-drive",
        label: "Cloud Drive",
        icon: FiCloud,
      },
      {
        href: "https://resumes.microdegree.work/",
        label: "Resume Builder",
        icon: FiFileText,
        betaBadge: true,
        external: true,
        target: "_self",
        onClick: handleResumeBuilderClick,
      },
      {
        to: "/student/refer-job-opening",
        label: "Refer a Job",
        icon: FiSend,
        imageBadge: "/sign.png",
        newBadge: true,
      },
      {
        to: "/student/career-guide",
        label: "Career Guide",
        icon: FiBookOpen,
      },
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
          fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4 transition-transform
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
            if (l.external) {
              return (
                <a
                  key={l.href}
                  href={l.href}
                  target={l.target || "_blank"}
                  rel={l.target === "_self" ? undefined : "noopener noreferrer"}
                  onClick={(event) => {
                    if (typeof l.onClick === "function") {
                      l.onClick(event);
                      return;
                    }
                    onClose?.();
                  }}
                  className={`${linkBase} text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
                >
                  {Icon && <Icon className="h-4 w-4 text-slate-500" />}
                  <span>{l.label}</span>
                  {l.betaBadge ? (
                    <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Beta
                    </span>
                  ) : null}
                </a>
              );
            }

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
                    {isStudent && l.to === "/student/cloud-drive" ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
                          <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        </span>
                        <span>Live</span>
                      </span>
                    ) : null}
                    {l.newBadge ? (
                      <span className="ml-auto inline-flex items-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                    {isStudent &&
                      l.to === "/student/external-jobs" &&
                      externalJobsCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          {externalJobsCount > 99 ? "100+" : externalJobsCount}
                        </span>
                      )}
                    {isAdmin &&
                      l.to === "/admin/referred-data" &&
                      referredDataCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                          {referredDataCount > 99 ? "99+" : referredDataCount}
                        </span>
                      )}
                  </>
                )}
              </NavLink>
            );
          })}

          {isAdmin || isSuperAdmin ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setPlacementSectionOpen((prev) => !prev)}
                className={`${linkBase} justify-between text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
              >
                <span className="inline-flex items-center gap-3">
                  <FiBriefcase className="h-4 w-4 text-slate-500" />
                  <span>Placement Pipeline</span>
                </span>
                {placementSectionOpen ? (
                  <FiChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {placementSectionOpen ? (
                <div className="space-y-1 pl-6">
                  <NavLink
                    to={`/${
                      isSuperAdmin ? "superadmin" : "admin"
                    }/placement-status-pipeline/master-dashboard`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBase} py-2 ${
                        isActive
                          ? "border border-primary/20 bg-primary/10 text-primary shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    Master Dashboard
                  </NavLink>

                  <NavLink
                    to={`/${
                      isSuperAdmin ? "superadmin" : "admin"
                    }/placement-status-pipeline/interview-mapped-candidates`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${linkBase} py-2 ${
                        isActive
                          ? "border border-primary/20 bg-primary/10 text-primary shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    Interview Mapped Candidates
                  </NavLink>
                </div>
              ) : null}
            </div>
          ) : null}
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

Sidebar.propTypes = {
  role: PropTypes.string,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
};
