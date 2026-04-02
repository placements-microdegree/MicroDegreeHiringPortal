export default function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  icon: Icon,
  rightSlot,
  error,
  required = false,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </span>
      ) : null}

      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
            aria-hidden="true"
          />
        ) : null}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-2xl border bg-white py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/25"
          } ${Icon ? "pl-11" : "pl-4"} ${rightSlot ? "pr-12" : "pr-4"}`}
        />

        {rightSlot ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightSlot}
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
