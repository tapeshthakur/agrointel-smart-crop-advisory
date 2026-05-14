import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
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
    <header className="sticky top-0 z-40 border-b border-emerald-950/80 bg-emerald-950/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-300/25 bg-lime-300/10 text-base font-bold text-lime-200 shadow-lg shadow-lime-950/20 transition-all duration-200 group-hover:border-lime-300/50 group-hover:bg-lime-300/15">
            SC
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/55">Smart Farming Suite</p>
            <p className="text-lg font-semibold tracking-tight text-lime-200 transition-all duration-200 group-hover:text-lime-100">
              {t("nav.brand")}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 rounded-2xl border border-emerald-800/60 bg-emerald-950/45 px-3 py-2 md:flex">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/70">{t("nav.language")}</label>
            <ThemedSelect value={language} onChange={setLanguage} options={languageOptions} className="min-w-[138px]" />
          </div>

          <div className="md:hidden">
            <ThemedSelect value={language} onChange={setLanguage} options={languageOptions} className="min-w-[118px]" />
          </div>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className="rounded-2xl border border-emerald-700/50 bg-emerald-950/35 px-4 py-2 text-sm text-emerald-50 transition-all duration-200 hover:border-lime-300/35 hover:bg-emerald-900/60"
              >
                {t("nav.login")}
              </NavLink>
              <NavLink
                to="/signup"
                className="theme-button-primary px-4 py-2"
              >
                {t("nav.getStarted")}
              </NavLink>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-emerald-800/60 bg-emerald-950/45 px-4 py-2 sm:block">
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/55">Signed in</p>
                <p className="mt-1 text-sm font-medium text-emerald-50">
                  {user?.name} <span className="text-emerald-200/65">({user?.role})</span>
                </p>
              </div>
              <NavLink
                to="/dashboard"
                className="rounded-2xl border border-emerald-700/50 bg-emerald-950/35 px-4 py-2 text-sm text-emerald-50 transition-all duration-200 hover:border-lime-300/35 hover:bg-emerald-900/60"
              >
                {t("nav.dashboard")}
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="theme-button-primary px-4 py-2"
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
