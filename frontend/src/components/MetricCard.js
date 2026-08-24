import React from "react";
import StatCard from "./StatCard";

function MetricCard({ title, value, subtitle, accent = "primary", align = "left" }) {
  const accentMap = {
    primary: "primary",
    accent: "accent",
    success: "success",
    warning: "warning",
  };

  return <StatCard title={title} value={value} subtitle={subtitle} accent={accentMap[accent] || "primary"} align={align} />;
}

export default MetricCard;
