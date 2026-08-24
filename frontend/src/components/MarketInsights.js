import React, { useEffect, useState } from "react";
import api from "../api/client";
import LoadingSpinner from "./LoadingSpinner";
import { useLanguage } from "../i18n/LanguageContext";

function MarketInsights({ stateName, season, crop }) {
  const { t, tv } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(
          `/api/market/overview?state=${encodeURIComponent(stateName)}&season=${encodeURIComponent(season)}&crop=${encodeURIComponent(crop)}`
        );
        setData(response.data || null);
      } catch (err) {
        setError(err.response?.data?.error || t("market.failed"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [stateName, season, crop]);

  const activeCrop = data?.crop || crop;
  const activeSeason = data?.season || season;
  const marketTrend = (cropName) => {
    const key = String(cropName || "").toLowerCase();
    return t(`market.mspData.${key}Trend`, data?.msp?.trend || "");
  };
  const marketTip = () => t(`market.tips.${String(data?.season || season || "kharif").toLowerCase()}`, data?.market_tip || "");
  const schemeBenefit = (scheme) => {
    const name = String(scheme?.name || "").toLowerCase();
    if (name.includes("magel")) return t("market.schemeBenefits.farmPond");
    if (name.includes("pm-kisan")) return t("market.schemeBenefits.pmKisan");
    if (name.includes("pani")) return t("market.schemeBenefits.paniBachao");
    if (name.includes("durghatna")) return t("market.schemeBenefits.accidentSupport");
    if (name.includes("raitha")) return t("market.schemeBenefits.raithaSiri");
    return scheme?.benefit || "";
  };
  const mandiSummary = data?.mandi?.summary;
  const mandiRecords = data?.mandi?.records || [];
  const livePrice = data?.msp?.live_modal_price || mandiSummary?.display_price;

  return (
    <section className="surface-card p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="section-badge">{t("farmer.marketEyebrow")}</span>
          <h2 className="mt-4 text-3xl font-semibold text-text-heading">{t("market.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t("market.subtitle")}</p>
        </div>
        <div className="grid gap-2 text-sm text-text-muted sm:text-right">
          <span>{t("market.state")}: <strong className="text-text-heading">{tv("states", stateName)}</strong></span>
          <span>{t("market.season")}: <strong className="text-text-heading">{tv("seasons", activeSeason)}</strong></span>
          <span>{t("market.forCrop")}: <strong className="capitalize text-accent-700">{tv("crops", activeCrop)}</strong></span>
        </div>
      </div>

      {loading ? <LoadingSpinner label={t("market.loading")} /> : null}
      {error ? <p className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="space-y-4">
            <div className="surface-card-highlight p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent-700">
                {data.mandi?.is_live ? "Live mandi price" : t("market.msp")}
              </p>
              <p className="mt-3 text-3xl font-bold text-text-heading">{livePrice || data.msp?.msp}</p>
              <p className="mt-3 text-sm leading-6 text-text-muted">{marketTrend(data.crop || activeCrop)}</p>
              <div className="mt-4 grid gap-2 text-xs text-text-subtle sm:grid-cols-2">
                <span>Source: {data.mandi?.source || "Reference MSP"}</span>
                <span>Status: {data.mandi?.is_live ? (data.mandi?.from_cache ? "Live cached" : "Live updated") : "Fallback"}</span>
                {mandiSummary?.latest_arrival_date ? <span>Latest date: {mandiSummary.latest_arrival_date}</span> : null}
                {mandiSummary?.record_count ? <span>Markets: {mandiSummary.record_count}</span> : null}
              </div>
              {!data.mandi?.is_live && data.mandi?.message ? (
                <p className="mt-3 rounded-2xl border border-amber-300/20 bg-warning-50 px-4 py-3 text-xs leading-5 text-warning-700">
                  {data.mandi.message}
                </p>
              ) : null}
            </div>

            {data.mandi?.is_live ? (
              <div className="surface-card-soft p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-accent-600">Recent mandi records</p>
                <div className="mt-4 space-y-3">
                  {mandiRecords.slice(0, 4).map((record, index) => (
                    <div key={`${record.market}-${record.arrival_date}-${index}`} className="rounded-[1.1rem] border border-surface-border bg-surface-card p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-heading">{record.market || "Market"}</p>
                          <p className="mt-1 text-xs text-text-subtle">{record.district} | {record.arrival_date}</p>
                        </div>
                        <p className="text-sm font-semibold text-accent-700">
                          {record.modal_price !== null && record.modal_price !== undefined ? `Rs. ${Number(record.modal_price).toLocaleString("en-IN")} / qtl` : "-"}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-text-subtle">
                        Min {record.min_price ?? "-"} | Max {record.max_price ?? "-"} | {record.variety || record.commodity}
                      </p>
                    </div>
                  ))}
                </div>
            </div>
            ) : null}

            <div className="surface-card-soft p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent-600">{t("market.tip")}</p>
              <p className="mt-3 text-sm leading-7 text-text-muted">{marketTip()}</p>
            </div>

            <div className="surface-card-soft p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent-600">{t("market.kvk")}</p>
              <p className="mt-3 text-lg font-semibold text-text-heading">{data.kvk?.name}</p>
              <p className="mt-2 text-sm text-text-muted">{data.kvk?.contact}</p>
            </div>
          </div>

          <div className="surface-card-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent-600">{t("market.schemes")}</p>
            <div className="mt-4 space-y-3">
              {data.schemes?.map((scheme) => (
                <div key={scheme.name} className="rounded-[1.25rem] border border-surface-border bg-surface-card p-4">
                  <p className="text-base font-semibold text-text-heading">{scheme.name}</p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{schemeBenefit(scheme)}</p>
                  <a href={scheme.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent-700 hover:text-accent-800">
                    {t("market.visitLink")}
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
