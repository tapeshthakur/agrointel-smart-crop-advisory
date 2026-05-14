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
      {label ? <label className="mb-2 block text-sm font-medium text-emerald-100/90">{label}</label> : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium outline-none transition-all duration-200",
          open
            ? "border-lime-300/70 bg-emerald-950 shadow-[0_0_0_4px_rgba(184,255,59,0.12)]"
            : "border-emerald-700/40 bg-gradient-to-b from-emerald-900/80 to-emerald-950/90 hover:border-lime-300/35",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-emerald-50">{selectedOption?.label || "Select"}</span>
        <span className={`text-xs text-lime-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>v</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-lime-300/25 bg-emerald-950/98 p-1 shadow-2xl shadow-black/35 backdrop-blur-xl">
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
                      ? "bg-lime-300/16 text-lime-100"
                      : "text-emerald-100 hover:bg-emerald-800/70 hover:text-lime-100",
                  ].join(" ")}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active ? <span className="text-lime-300">selected</span> : null}
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
