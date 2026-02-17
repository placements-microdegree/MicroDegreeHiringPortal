export default function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      ) : null}
      <input
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary ${className}`}
        {...props}
      />
    </label>
  );
}
