import React from "react";
import { Link } from "react-router-dom";
import heroFarm from "../assets/crops/wheat.jpg";
import { useLanguage } from "../i18n/LanguageContext";

function LandingPage() {
  const { t } = useLanguage();
  const featureHighlights = [
    { title: t("landing.features.cropTitle"), description: t("landing.features.cropDesc") },
    { title: t("landing.features.diseaseTitle"), description: t("landing.features.diseaseDesc") },
    { title: t("landing.features.insightTitle"), description: t("landing.features.insightDesc") },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="app-shell min-h-[620px] overflow-hidden p-0">
        <img src={heroFarm} alt={t("landing.title")} className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/58" />
        <div className="absolute inset-0 ambient-grid opacity-70" />

        <div className="relative z-10 flex min-h-[620px] flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <span className="section-badge gentle-pulse">{t("landing.badge")}</span>
            <h1 className="fade-in-up mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-text-heading sm:text-5xl lg:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="fade-in-up mt-5 max-w-2xl text-base leading-8 text-text-muted sm:text-lg">
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
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featureHighlights.map((item) => (
              <div key={item.title} className="surface-card-soft bg-surface-card/92 p-5 backdrop-blur-sm">
                <p className="text-base font-semibold text-primary-800">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="surface-card-highlight p-6">
          <span className="section-badge">{t("landing.snapshot")}</span>
          <h2 className="mt-4 text-2xl font-semibold text-text-heading">{t("landing.snapshotTitle")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
            {t("landing.snapshotDesc")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{t("landing.modules")}</p>
            <p className="mt-3 text-3xl font-bold text-text-heading">4+</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">{t("landing.modulesDesc")}</p>
          </div>
          <div className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{t("landing.audience")}</p>
            <p className="mt-3 text-3xl font-bold text-accent-700">{t("landing.farmers")}</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">{t("landing.audienceDesc")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
