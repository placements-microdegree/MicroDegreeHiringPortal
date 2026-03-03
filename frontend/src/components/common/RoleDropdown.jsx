import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

export default function RoleDropdown({
  id = "role-dropdown",
  label = "Login Type",
  value,
  options = [],
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0] || null,
    [options, value],
  );

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>

      <button
        id={id}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span>{selectedOption?.label || "Select login role"}</span>
        <FiChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 z-30 mt-2 origin-top rounded-xl border border-slate-200 bg-white p-1 shadow-xl transition-all duration-200 ease-out ${isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        <ul role="listbox" aria-labelledby={id} className="max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-primary/10 font-semibold text-primary" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
