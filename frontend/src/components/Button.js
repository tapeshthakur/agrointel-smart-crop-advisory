import React from "react";

const variantClasses = {
  primary: "theme-button-primary",
  secondary: "theme-button-secondary",
  ghost: "theme-button-ghost",
};

function Button({ as: Component = "button", variant = "primary", className = "", children, ...props }) {
  return (
    <Component className={`${variantClasses[variant] || variantClasses.primary} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export default Button;
