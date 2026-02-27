import Button from "./Button";

export default function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-[720px]",
  scrollable = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] rounded-xl bg-white p-5 shadow-sm flex flex-col`}
      >
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>
        <div
          className={`mt-4 ${scrollable ? "min-h-0 overflow-y-auto pr-1" : ""}`}
        >
          {children}
        </div>
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  );
}
