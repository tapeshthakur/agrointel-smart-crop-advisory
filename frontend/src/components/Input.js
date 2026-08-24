import React from "react";

function Input({ label, className = "", id, ...props }) {
  const input = <input id={id} className={`field-shell ${className}`.trim()} {...props} />;

  if (!label) return input;

  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-medium text-text-heading">{label}</span>
      {input}
    </label>
  );
}

export default Input;
