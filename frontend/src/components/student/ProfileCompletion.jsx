export default function ProfileCompletion({ percent = 0 }) {
  return (
    <div className="rounded-xl bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Profile Completion
        </div>
        <div className="text-sm font-semibold text-primary">{percent}%</div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-primary to-primaryDark"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Complete your profile to improve shortlisting chances.
      </div>
    </div>
  );
}
