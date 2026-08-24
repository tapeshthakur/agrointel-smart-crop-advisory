import React, { useEffect, useRef, useState } from "react";

function ThemedSelect({ label, value, options, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label ? <label className="mb-2 block text-sm font-medium text-text-heading">{label}</label> : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium outline-none transition-all duration-200",
          open
            ? "border-primary-600 bg-white shadow-[0_0_0_4px_rgba(47,82,51,0.12)]"
            : "border-surface-border bg-white hover:border-primary-300",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-text-body">{selectedOption?.label || "Select"}</span>
        <span className={`text-xs text-primary-700 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>v</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-surface-border bg-white p-1 shadow-lift">
          <div className="max-h-64 overflow-auto rounded-[0.9rem]">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-all duration-150",
                    active
                      ? "bg-primary-50 text-primary-800"
                      : "text-text-body hover:bg-surface-muted hover:text-primary-800",
                  ].join(" ")}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active ? <span className="text-accent-600" aria-hidden="true">*</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ThemedSelect;
