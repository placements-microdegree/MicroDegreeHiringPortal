export default function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  disabled,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary to-primaryDark text-white hover:opacity-95",
    outline:
      "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    subtle:
      "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
