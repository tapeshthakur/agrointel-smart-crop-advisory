import React from "react";

function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/45 px-4 py-2.5 text-emerald-100 shadow-lg shadow-black/10">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-5 animate-ping rounded-full bg-lime-300/20" />
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/35 border-t-lime-200" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
