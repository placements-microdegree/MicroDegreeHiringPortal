import Button from "../common/Button";

export default function Navbar({
  title,
  profilePhotoUrl,
  onProfileClick,
  showProfile = true,
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      {showProfile ? (
        <Button variant="subtle" onClick={onProfileClick} className="gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-200">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="text-sm">Profile</div>
        </Button>
      ) : null}
    </header>
  );
}
