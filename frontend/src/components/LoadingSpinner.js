import React from "react";

function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-2.5 text-text-muted shadow-lg shadow-card">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-5 animate-ping rounded-full bg-accent-100" />
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-300 border-t-accent-500" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
