import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import Button from "./Button";
import ThemedSelect from "./ThemedSelect";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage, languageOptions, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-200 bg-primary-700 text-base font-bold text-text-inverse shadow-card transition-all duration-200 group-hover:bg-primary-800">
            SC
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">{t("nav.suite")}</p>
            <p className="text-lg font-semibold text-text-heading transition-all duration-200 group-hover:text-primary-700">
              {t("nav.brand")}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 rounded-2xl border border-surface-border bg-surface-card px-3 py-2 shadow-card md:flex">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{t("nav.language")}</label>
            <ThemedSelect value={language} onChange={setLanguage} options={languageOptions} className="min-w-[138px]" />
          </div>

          <div className="md:hidden">
            <ThemedSelect value={language} onChange={setLanguage} options={languageOptions} className="min-w-[118px]" />
          </div>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button as={NavLink} to="/login" variant="ghost" className="px-4 py-2">
                {t("nav.login")}
              </Button>
              <Button as={NavLink} to="/signup" className="px-4 py-2">
                {t("nav.getStarted")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-surface-border bg-surface-card px-4 py-2 shadow-card sm:block">
                <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">{t("nav.signedIn")}</p>
                <p className="mt-1 text-sm font-medium text-text-heading">
                  {user?.name} <span className="text-text-muted">({t(`signup.${user?.role}`, user?.role)})</span>
                </p>
              </div>
              <Button as={NavLink} to="/dashboard" variant="ghost" className="px-4 py-2">
                {t("nav.dashboard")}
              </Button>
              <Button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2"
              >
                {t("nav.logout")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
