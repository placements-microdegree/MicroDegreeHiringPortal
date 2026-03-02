import { NavLink } from "react-router-dom";
import { FiX } from "react-icons/fi";
import Button from "../common/Button";
import { ROLES } from "../../utils/constants";
import { useAuth } from "../../context/authStore";

const linkBase = "block rounded-xl px-3 py-2 text-sm font-medium transition";

export default function Sidebar({ role, isOpen = false, onClose }) {
  const { logout } = useAuth();

  const links =
    role === ROLES.SUPER_ADMIN
      ? [
          { to: "/superadmin/dashboard", label: "Dashboard" },
          { to: "/superadmin/manage-hr", label: "Manage HR Admins" },
          { to: "/superadmin/students", label: "View Students" },
          { to: "/superadmin/jobs", label: "View Jobs" },
          { to: "/superadmin/applications", label: "Applications" },
          { to: "/superadmin/checker", label: "Checker" },
        ]
      : role === ROLES.ADMIN
        ? [
            { to: "/admin/dashboard", label: "Dashboard" },
            { to: "/admin/post-jd", label: "Post JD" },
            { to: "/admin/manage-applications", label: "Manage Applications" },
          ]
        : [
            { to: "/student/dashboard", label: "Dashboard" },
            { to: "/student/jobs", label: "JD" },
            { to: "/student/applications", label: "Application Status" },
            { to: "/student/help", label: "Help Center" },
          ];

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition md:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white p-4 transition-transform md:static md:z-auto md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-3 flex items-center justify-between gap-2">
          <div className="flex flex-col items-center">
            <img src="/Logo.png" alt="MicroDegree" className="h-20" />
            {/* <div className="text-xs text-slate-600">Placement Portal</div> */}
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

        <nav className="mt-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-50"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6">
          <Button variant="outline" className="w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
