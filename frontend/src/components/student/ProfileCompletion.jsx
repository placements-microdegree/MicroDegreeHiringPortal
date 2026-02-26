export default function ProfileCompletion({ percent = 0 }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const ringStyle = {
    background: `conic-gradient(var(--color-primary, #4f46e5) ${safePercent * 3.6}deg, #e2e8f0 0deg)`,
  };

  return (
    <div className="rounded-xl bg-white p-3">
      <button
        type="button"
        className="inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-full p-[2px]"
          style={ringStyle}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="text-left">
          <div className="text-sm leading-4">Profile</div>
          <div className="mt-0.5 text-xs font-medium text-primary">
            {safePercent}% Complete
          </div>
        </div>
      </button>
      <div className="mt-2 text-xs text-slate-600">
        Keep profile above 80% for better visibility.
      </div>
    </div>
  );
}
