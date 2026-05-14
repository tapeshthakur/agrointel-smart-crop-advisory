import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

function CropCard({ crop, confidence, irrigation, imageSrc, advisory }) {
  const { t } = useLanguage();
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const confidencePercent = Number.isFinite(Number(confidence))
    ? Math.max(0, Math.min(100, Number(confidence) <= 1 ? Number(confidence) * 100 : Number(confidence)))
    : 0;
  const irrigationValue = Number.isFinite(Number(irrigation)) ? Number(irrigation).toFixed(4) : "-";
  const confidenceStyle = {
    background: `conic-gradient(#c8ff67 ${confidencePercent * 3.6}deg, rgba(255, 255, 255, 0.08) 0deg)`,
  };

  return (
    <div id="advisory-report" className="fade-in-up surface-card overflow-hidden">
      <div className="border-b border-emerald-800/60 bg-emerald-950/55 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-lime-200">Farmer Advisory Report</p>
            <h3 className="mt-2 text-2xl font-semibold text-emerald-50">Smart Crop Recommendation Summary</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-100/68">
              Formal report generated from crop ML prediction, irrigation model output, fertilizer rules, and season-aware advisory logic.
            </p>
          </div>
          <div className="grid gap-2 rounded-2xl border border-emerald-700/40 bg-emerald-950/60 p-4 text-sm text-emerald-100/76 sm:min-w-[240px]">
            <div className="flex justify-between gap-4">
              <span>Generated</span>
              <strong className="text-emerald-50">{generatedDate}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Season</span>
              <strong className="text-emerald-50">{advisory?.seasonal_advice?.current_season || "-"}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>State</span>
              <strong className="text-emerald-50">{advisory?.seasonal_advice?.state || "-"}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-0 xl:grid-cols-[1.1fr,1fr]">
        <div className="relative min-h-[320px] overflow-hidden">
          <img src={imageSrc} alt={crop || "Predicted crop"} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <span className="section-badge">{t("cropCard.recommended")}</span>
            <p className="mt-4 text-4xl font-bold capitalize text-lime-200 sm:text-5xl">{crop || "-"}</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/80">
              {advisory?.explanation?.summary || "The advisory engine combined soil nutrients, weather, and seasonal context to select the best-fit crop."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6">
          <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
            <div className="surface-card-soft flex flex-col items-center justify-center p-5 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full p-2" style={confidenceStyle}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-950 text-center shadow-inner shadow-black/30">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">{t("cropCard.confidence")}</p>
                    <p className="mt-1 text-2xl font-bold text-lime-200">{confidencePercent.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="surface-card-soft p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">{t("cropCard.irrigationRequirement")}</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-3xl font-bold text-emerald-50">{irrigationValue}</p>
                  {advisory?.irrigation?.level ? (
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
                      {advisory.irrigation.level}
                    </span>
                  ) : null}
                </div>
                {advisory?.irrigation ? (
                  <p className="mt-3 text-sm leading-6 text-emerald-100/72">{advisory.irrigation.recommendation}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-card-soft p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">{t("cropCard.currentSeason")}</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-50">{advisory?.seasonal_advice?.current_season || "-"}</p>
                </div>
                <div className="surface-card-soft p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">{t("cropCard.state")}</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-50">{advisory?.seasonal_advice?.state || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("cropCard.aiExplanation")}</p>
                <h4 className="mt-2 text-xl font-semibold text-emerald-50">{t("cropCard.why")}</h4>
              </div>
              <span className="rounded-full border border-emerald-700/60 px-3 py-1 text-xs font-medium text-emerald-100/70">
                {advisory?.seasonal_advice?.season_fit ? t("cropCard.goodFit") : t("cropCard.seasonContext")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-emerald-100/80">{advisory?.explanation?.plain_reason}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {advisory?.explanation?.main_drivers?.map((driver) => (
                <div key={driver.feature} className="rounded-2xl border border-emerald-700/40 bg-emerald-950/65 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/65">{driver.feature}</p>
                  <p className="mt-2 text-xl font-semibold text-lime-200">{driver.value}</p>
                  <p className="mt-2 text-xs text-emerald-100/55">{Number(driver.importance).toFixed(2)}% {t("cropCard.importance")}</p>
                </div>
              ))}
            </div>
          </div>

          {advisory?.season_adjusted ? (
            <div className="surface-card-highlight p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-lime-200">Season-adjusted recommendation</p>
                  <h4 className="mt-2 text-xl font-semibold text-emerald-50">{advisory.season_adjusted.season_adjusted_crop}</h4>
                </div>
                <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-100">
                  {advisory.season_adjusted.active_season}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-emerald-100/78">{advisory.season_adjusted.message}</p>
              <div className="mt-4 space-y-3">
                {advisory.season_adjusted.ranking?.slice(0, 3).map((item) => (
                  <div key={item.crop} className="rounded-2xl border border-emerald-700/40 bg-emerald-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-emerald-50">{item.crop}</p>
                      <p className="text-sm font-semibold text-lime-200">{item.season_adjusted_score}%</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-emerald-900/80">
                      <div className="h-2 rounded-full bg-lime-300" style={{ width: `${Math.min(100, item.season_adjusted_score)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-emerald-100/58">
                      ML {item.ml_confidence}% | Input fit {item.input_suitability}% | Season {item.season_fit ? "fit" : "review"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {advisory ? (
        <div className="grid gap-4 border-t border-emerald-800/60 p-5 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("cropCard.fertilizerAdvice")}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {advisory.fertilizer?.map((item) => (
                <div key={item.nutrient} className="rounded-2xl border border-emerald-700/40 bg-emerald-950/65 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-emerald-50">{item.nutrient}</strong>
                    <span className="rounded-full bg-lime-300/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-200">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-emerald-100/60">
                    {t("cropCard.current")} {item.value} | {t("cropCard.target")} {item.target}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-emerald-100/78">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("cropCard.seasonContext")}</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/65 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/60">{t("cropCard.goodFit")}</p>
                <p className="mt-2 text-xl font-semibold text-lime-200">
                  {advisory.seasonal_advice?.season_fit ? t("cropCard.yes") : t("cropCard.no")}
                </p>
                {advisory.seasonal_advice?.season_priority ? (
                  <p className="mt-2 text-xs capitalize text-emerald-100/58">{advisory.seasonal_advice.season_priority}</p>
                ) : null}
              </div>
              <p className="text-sm leading-7 text-emerald-100/80">{advisory.seasonal_advice?.season_message}</p>
              <p className="text-sm leading-7 text-emerald-100/68">{advisory.seasonal_advice?.location_message}</p>
              {advisory.seasonal_advice?.recommended_season_crops?.length ? (
                <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/65 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/60">Season crop options</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {advisory.seasonal_advice.recommended_season_crops.slice(0, 6).map((seasonCrop) => (
                      <span key={seasonCrop} className="rounded-full border border-lime-300/15 bg-lime-300/8 px-3 py-1 text-xs capitalize text-lime-100">
                        {seasonCrop}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {advisory.crop_comparison?.length ? (
            <section className="surface-card-soft p-5 lg:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">Crop comparison mode</p>
                  <h4 className="mt-2 text-xl font-semibold text-emerald-50">Wheat vs Rice vs Maize</h4>
                </div>
                <p className="text-sm text-emerald-100/62">Score combines entered climate, NPK, state, and season.</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {advisory.crop_comparison.map((item) => (
                  <div key={item.crop} className="rounded-2xl border border-emerald-700/40 bg-emerald-950/65 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-emerald-50">{item.crop}</p>
                        <p className="mt-1 text-xs text-emerald-100/55">Water need: {item.water_need}</p>
                      </div>
                      <span className="rounded-full border border-lime-300/15 bg-lime-300/10 px-2.5 py-1 text-xs font-semibold text-lime-100">
                        {item.suitability_score}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-emerald-900/80">
                      <div className="h-2 rounded-full bg-lime-300" style={{ width: `${Math.min(100, item.suitability_score)}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${item.season_fit ? "bg-lime-300/12 text-lime-100" : "bg-amber-300/12 text-amber-100"}`}>
                        {item.season_fit ? "Season fit" : "Season review"}
                      </span>
                      <span className="rounded-full bg-emerald-800/60 px-2.5 py-1 text-xs text-emerald-100/75">
                        {item.fertilizer_focus}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-100/72">{item.risk}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CropCard;
