import React from "react";
import { Link } from "react-router-dom";
import heroFarm from "../assets/crops/wheat.jpg";
import { useLanguage } from "../i18n/LanguageContext";

const featureHighlights = [
  {
    title: "Crop Intelligence",
    description: "Recommend the best crop using soil nutrients, season, and weather-aware inputs.",
  },
  {
    title: "Disease Scanning",
    description: "Upload leaf images to review possible disease symptoms with treatment guidance.",
  },
  {
    title: "Farmer Insights",
    description: "Combine irrigation, fertilizer, schemes, and recent predictions in one workflow.",
  },
];

function LandingPage() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="app-shell ambient-grid overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 xl:block">
          <img src={heroFarm} alt="Farmland" className="h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/20 via-emerald-950/55 to-emerald-950" />
        </div>

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.15fr,0.85fr] xl:items-center">
          <div className="max-w-3xl">
            <span className="section-badge gentle-pulse">{t("landing.badge")}</span>
            <h1 className="fade-in-up mt-5 text-4xl font-bold leading-tight text-emerald-50 sm:text-5xl lg:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="fade-in-up mt-5 max-w-2xl text-base leading-8 text-emerald-100/78 sm:text-lg">
              {t("landing.subtitle")}
            </p>

            <div className="fade-in-up mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="theme-button-primary px-6 py-3">
                {t("nav.getStarted")}
              </Link>
              <Link to="/login" className="theme-button-secondary px-6 py-3">
                {t("nav.login")}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {featureHighlights.map((item) => (
                <div key={item.title} className="surface-card-soft p-4">
                  <p className="text-base font-semibold text-lime-200">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/70">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface-card-highlight p-6">
              <span className="section-badge">Project Snapshot</span>
              <h2 className="mt-4 text-2xl font-semibold text-emerald-50">Built for farmer-first decision support</h2>
              <p className="mt-3 text-sm leading-7 text-emerald-100/76">
                Present crop recommendation, irrigation planning, disease detection, and support schemes as one connected advisory system instead of separate tools.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-card-soft p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/60">Modules</p>
                <p className="mt-3 text-3xl font-bold text-emerald-50">4+</p>
                <p className="mt-2 text-sm text-emerald-100/68">Crop, disease, market, and advisory reporting in one experience.</p>
              </div>
              <div className="surface-card-soft p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/60">Audience</p>
                <p className="mt-3 text-3xl font-bold text-lime-200">Farmers</p>
                <p className="mt-2 text-sm text-emerald-100/68">Designed for simple inputs, clear outputs, and mobile-first demos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
