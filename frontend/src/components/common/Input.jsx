export default function Input({ label, error = "", className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      ) : null}
      <input
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${error ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"} ${className}`}
        {...props}
      />
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
    </label>
  );
}
