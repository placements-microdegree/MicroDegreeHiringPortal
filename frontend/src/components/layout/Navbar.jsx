import Button from "../common/Button";
import { FiMenu } from "react-icons/fi";
import NotificationBell from "./NotificationBell";

export default function Navbar({
  title,
  profilePhotoUrl,
  studentName = "Student",
  onProfileClick,
  onMenuClick,
  showProfile = true,
  completionPercent = null,
}) {
  const safePercent = Math.max(
    0,
    Math.min(100, Number(completionPercent) || 0),
  );
  const showCompletion =
    completionPercent !== null && completionPercent !== undefined;
  const ringStyle = showCompletion
    ? {
        background: `conic-gradient(var(--color-primary, #2563eb) ${safePercent * 3.6}deg, #e2e8f0 0deg)`,
      }
    : undefined;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
        >
          <FiMenu className="h-5 w-5" />
        </button>
        <div className="truncate text-sm font-semibold text-slate-900 md:text-base">
          {title}
        </div>
      </div>
      {showProfile ? (
        <div className="flex items-center gap-2 md:gap-3">
          <NotificationBell />

          <Button
            variant="subtle"
            onClick={onProfileClick}
            className="gap-2 px-2 py-1.5 md:gap-3 md:px-4 md:py-2"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${showCompletion ? "p-[2px]" : "overflow-hidden bg-slate-200"}`}
              style={ringStyle}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                <div className="h-[30px] w-[30px] overflow-hidden rounded-full bg-slate-200">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-semibold text-slate-800">
                {studentName}
              </div>
              <div className="text-xs text-slate-500">Student</div>
            </div>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
