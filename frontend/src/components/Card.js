import React from "react";

const toneClasses = {
  default: "surface-card",
  soft: "surface-card-soft",
  highlight: "surface-card-highlight",
  chart: "chart-shell",
};

function Card({ as: Component = "div", tone = "default", className = "", children, ...props }) {
  return (
    <Component className={`${toneClasses[tone] || toneClasses.default} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export default Card;
