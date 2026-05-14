import React from "react";

function MetricCard({ title, value, subtitle, accent = "lime", align = "left" }) {
  const accentMap = {
    lime: "from-lime-300/20 to-lime-300/0 text-lime-200",
    amber: "from-amber-300/20 to-amber-300/0 text-amber-200",
    emerald: "from-emerald-300/18 to-emerald-300/0 text-emerald-200",
  };

  return (
    <div className="metric-panel">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${accentMap[accent] || accentMap.lime} opacity-80`} />
      <div className={`relative ${align === "right" ? "text-right" : ""}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/65">{title}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-50 sm:text-[2rem]">{value}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-emerald-100/68">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default MetricCard;
