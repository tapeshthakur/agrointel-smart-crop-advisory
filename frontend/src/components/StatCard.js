import React from "react";

function StatCard({ title, value, subtitle, accent = "primary", align = "left" }) {
  const titleTone = {
    primary: "text-primary-700",
    accent: "text-accent-700",
    success: "text-success-700",
    warning: "text-warning-700",
  };

  return (
    <div className="metric-panel">
      <div className={align === "right" ? "text-right" : ""}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${titleTone[accent] || titleTone.primary}`}>{title}</p>
        <p className="mt-2 text-2xl font-bold text-text-heading sm:text-[1.7rem]">{value}</p>
        {subtitle ? <p className="mt-1 text-sm leading-5 text-text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default StatCard;
