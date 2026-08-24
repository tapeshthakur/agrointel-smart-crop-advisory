import React from "react";

const toneClasses = {
  default: "section-badge",
  primary: "inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800",
  accent: "inline-flex items-center rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-800",
  muted: "inline-flex items-center rounded-full border border-surface-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted",
};

function Badge({ tone = "default", className = "", children, ...props }) {
  return (
    <span className={`${toneClasses[tone] || toneClasses.default} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

export default Badge;
