import React, { useEffect, useState } from "react";
import api from "../api/client";
import LoadingSpinner from "./LoadingSpinner";
import { useLanguage } from "../i18n/LanguageContext";

function MarketInsights({ stateName, season, crop }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(
          `/api/market/overview?state=${encodeURIComponent(stateName)}&season=${encodeURIComponent(season)}&crop=${encodeURIComponent(crop || "wheat")}`
        );
        setData(response.data || null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load market data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [stateName, season, crop]);

  return (
    <section className="surface-card p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="section-badge">{t("farmer.marketEyebrow")}</span>
          <h2 className="mt-4 text-3xl font-semibold text-emerald-50">{t("market.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/68">{t("market.subtitle")}</p>
        </div>
        <div className="grid gap-2 text-sm text-emerald-100/75 sm:text-right">
          <span>{t("market.state")}: <strong className="text-emerald-50">{stateName}</strong></span>
          <span>{t("market.season")}: <strong className="text-emerald-50">{season}</strong></span>
          <span>{t("market.forCrop")}: <strong className="capitalize text-lime-200">{crop || "wheat"}</strong></span>
        </div>
      </div>

      {loading ? <LoadingSpinner label={t("market.loading")} /> : null}
      {error ? <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="space-y-4">
            <div className="surface-card-highlight p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-lime-200">{t("market.msp")}</p>
              <p className="mt-3 text-3xl font-bold text-emerald-50">{data.msp?.msp}</p>
              <p className="mt-3 text-sm leading-6 text-emerald-100/75">{data.msp?.trend}</p>
            </div>

            <div className="surface-card-soft p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("market.tip")}</p>
              <p className="mt-3 text-sm leading-7 text-emerald-100/80">{data.market_tip}</p>
            </div>

            <div className="surface-card-soft p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("market.kvk")}</p>
              <p className="mt-3 text-lg font-semibold text-emerald-50">{data.kvk?.name}</p>
              <p className="mt-2 text-sm text-emerald-100/72">{data.kvk?.contact}</p>
            </div>
          </div>

          <div className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300">{t("market.schemes")}</p>
            <div className="mt-4 space-y-3">
              {data.schemes?.map((scheme) => (
                <div key={scheme.name} className="rounded-[1.25rem] border border-emerald-700/40 bg-emerald-950/65 p-4">
                  <p className="text-base font-semibold text-emerald-50">{scheme.name}</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/72">{scheme.benefit}</p>
                  <a href={scheme.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-lime-200 hover:text-lime-100">
                    Visit scheme link
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default MarketInsights;
