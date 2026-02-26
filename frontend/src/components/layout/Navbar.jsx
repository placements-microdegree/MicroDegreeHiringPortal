import Button from "../common/Button";

export default function Navbar({
  title,
  profilePhotoUrl,
  onProfileClick,
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
        background: `conic-gradient(var(--color-primary, #4f46e5) ${safePercent * 3.6}deg, #e2e8f0 0deg)`,
      }
    : undefined;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      {showProfile ? (
        <Button variant="subtle" onClick={onProfileClick} className="gap-3">
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
          <div className="text-sm">
            {/* Profile{showCompletion ? ` (${safePercent}%)` : ""} */} Profile
          </div>
        </Button>
      ) : null}
    </header>
  );
}
