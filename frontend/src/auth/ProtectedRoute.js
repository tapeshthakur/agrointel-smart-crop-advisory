import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { useLanguage } from "../i18n/LanguageContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, authLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <LoadingSpinner label={t("auth.authenticating")} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
