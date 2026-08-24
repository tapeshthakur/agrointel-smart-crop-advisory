import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AskAiAssistant from "../components/AskAiAssistant";
import CropCard from "../components/CropCard";
import DiseaseDetector from "../components/DiseaseDetector";
import LoadingSkeleton from "../components/LoadingSkeleton";
import LoadingSpinner from "../components/LoadingSpinner";
import MarketInsights from "../components/MarketInsights";
import MetricCard from "../components/MetricCard";
import Sidebar from "../components/Sidebar";
import ThemedSelect from "../components/ThemedSelect";
import { useLanguage } from "../i18n/LanguageContext";

import riceImage from "../assets/crops/rice.jpg";
import wheatImage from "../assets/crops/wheat.jpg";
import maizeImage from "../assets/crops/maize.jpg";
import chickpeaImage from "../assets/crops/chickpea.jpg";
import coffeeImage from "../assets/crops/coffee.jpg";

const FEATURE_FIELDS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];
const FIELD_RANGES = {
  N: { min: 0, max: 140, step: 1, fallback: 50 },
  P: { min: 0, max: 140, step: 1, fallback: 45 },
  K: { min: 0, max: 140, step: 1, fallback: 45 },
  temperature: { min: 0, max: 50, step: 0.1, fallback: 25 },
  humidity: { min: 0, max: 100, step: 1, fallback: 70 },
  ph: { min: 4, max: 9, step: 0.1, fallback: 6.5 },
  rainfall: { min: 0, max: 350, step: 1, fallback: 120 },
};
const STATE_OPTIONS = ["Maharashtra", "Punjab", "Uttar Pradesh", "Karnataka", "Gujarat"];
const SEASON_OPTIONS = ["Auto", "Kharif", "Rabi", "Zaid"];
const CROP_PRESETS = {
  wheat: {
    labelKey: "wheat",
    descriptionKey: "farmer.presets.wheatDesc",
    values: { N: "52", P: "50", K: "52", temperature: "20", humidity: "68", ph: "6.7", rainfall: "140" },
  },
  rice: {
    labelKey: "rice",
    descriptionKey: "farmer.presets.riceDesc",
    values: { N: "90", P: "45", K: "42", temperature: "27", humidity: "84", ph: "6.4", rainfall: "245" },
  },
  maize: {
    labelKey: "maize",
    descriptionKey: "farmer.presets.maizeDesc",
    values: { N: "65", P: "40", K: "40", temperature: "27", humidity: "62", ph: "6.5", rainfall: "145" },
  },
};
const CROP_IMAGE_MAP = {
  chickpea: chickpeaImage,
  coffee: coffeeImage,
  rice: riceImage,
  paddy: riceImage,
  wheat: wheatImage,
  maize: maizeImage,
  corn: maizeImage,
};
const HISTORY_PAIR_WINDOW_MS = 10000;

function predictionInputKey(inputData) {
  if (!inputData || typeof inputData !== "object") return "";
  return Object.keys(inputData)
    .sort()
    .map((key) => `${key}:${inputData[key]}`)
    .join("|");
}

function mergePredictionHistory(rows) {
  const groups = [];

  rows.forEach((row) => {
    const timestampMs = Date.parse(row.timestamp || "");
    const inputKey = predictionInputKey(row.input_data);
    const userKey = row.user_id ?? "current";
    const match = groups.find((group) => {
      if (group.inputKey !== inputKey || group.userKey !== userKey) return false;
      if (!Number.isFinite(timestampMs) || !Number.isFinite(group.timestampMs)) return false;
      return Math.abs(group.timestampMs - timestampMs) <= HISTORY_PAIR_WINDOW_MS;
    });

    if (match) {
      match.crop_prediction = match.crop_prediction || row.crop_prediction;
      match.irrigation_prediction =
        match.irrigation_prediction ?? row.irrigation_prediction;
      match.ids.push(row.id);
      if (Number.isFinite(timestampMs) && timestampMs > match.timestampMs) {
        match.timestamp = row.timestamp;
        match.timestampMs = timestampMs;
      }
      return;
    }

    groups.push({
      ...row,
      ids: [row.id],
      inputKey,
      userKey,
      timestampMs,
    });
  });

  return groups;
}

function FarmerDashboard() {
  const { user } = useAuth();
  const { t, tv } = useLanguage();
  const [activeTab, setActiveTab] = useState("crop");
  const [selectedState, setSelectedState] = useState("Maharashtra");
  const [selectedSeason, setSelectedSeason] = useState("Auto");
  const [liveWeather, setLiveWeather] = useState(null);
  const [form, setForm] = useState({ N: "", P: "", K: "", temperature: "", humidity: "", ph: "", rainfall: "" });
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const tabs = [
    { id: "crop", label: t("farmer.cropTab"), eyebrow: t("farmer.cropEyebrow"), description: t("farmer.cropDesc") },
    { id: "disease", label: t("farmer.diseaseTab"), eyebrow: t("farmer.diseaseEyebrow"), description: t("farmer.diseaseDesc") },
    { id: "market", label: t("farmer.marketTab"), eyebrow: t("farmer.marketEyebrow"), description: t("farmer.marketDesc") },
    {
      id: "ai",
      label: t("ai.tab", "Ask AI"),
      eyebrow: t("ai.eyebrow", "Groq assistant"),
      description: t("ai.description", "Ask follow-up questions about your crop, irrigation, disease, and market guidance."),
    },
    { id: "history", label: t("farmer.historyTab"), eyebrow: t("farmer.historyEyebrow"), description: t("farmer.historyDesc") },
  ];

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get("/api/predictions");
      setPredictions(response.data.predictions || []);
    } catch (err) {
      setError(err.response?.data?.error || t("farmer.historyFailed"));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleChange = (field, value) => {
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const applyPreset = (presetKey) => {
    const preset = CROP_PRESETS[presetKey];
    if (!preset) return;
    setForm(preset.values);
    setError("");
  };

  const applyWeatherValues = (weather) => {
    setForm((prev) => ({
      ...prev,
      temperature: String(weather.temperature),
      humidity: String(weather.humidity),
      rainfall: String(weather.rainfall),
    }));
    setLiveWeather(weather);
  };

  const fetchWeatherForLocation = async () => {
    setError("");
    if (!navigator.geolocation) {
      setError(t("farmer.geoUnsupported"));
      return;
    }

    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain&timezone=auto`
          );
          if (!response.ok) {
            throw new Error("Weather service unavailable");
          }
          const data = await response.json();
          applyWeatherValues({
            temperature: Number(data.current?.temperature_2m || 0).toFixed(1),
            humidity: Number(data.current?.relative_humidity_2m || 0).toFixed(0),
            rainfall: Number(data.current?.rain || 0).toFixed(1),
            source: "Open-Meteo",
          });
        } catch (_err) {
          setError(t("farmer.weatherFailed"));
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeatherLoading(false);
        setError(t("farmer.locationDenied"));
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const printAdvisory = () => {
    window.print();
  };

  const isComplete = FEATURE_FIELDS.every((field) => form[field] !== "");

  const handlePredict = async (event) => {
    event.preventDefault();
    setError("");

    if (!isComplete) {
      setError(t("farmer.fillFields"));
      return;
    }

    const payload = Object.fromEntries(FEATURE_FIELDS.map((field) => [field, Number(form[field])]));

    try {
      setLoading(true);
      const [cropResponse, irrigationResponse] = await Promise.all([
        api.post("/api/predict/crop", payload),
        api.post("/api/predict/irrigation", payload),
      ]);

      const nextResult = {
        crop: cropResponse.data.result?.predicted_crop,
        confidence: cropResponse.data.result?.confidence,
        irrigation: irrigationResponse.data.result?.predicted_irrigation_requirement,
        topCrops: cropResponse.data.result?.top_crops || [],
      };

      const advisoryResponse = await api.post("/api/advisory", {
        crop: nextResult.crop,
        confidence: nextResult.confidence,
        irrigation: nextResult.irrigation,
        inputs: payload,
        state: selectedState,
        season: selectedSeason,
        top_crops: nextResult.topCrops,
      });

      setResult(nextResult);
      setAdvisory(advisoryResponse.data.advisory || null);
      setActiveTab("crop");
      await fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || t("farmer.predictionFailed"));
    } finally {
      setLoading(false);
    }
  };

  const combinedPredictions = useMemo(() => mergePredictionHistory(predictions), [predictions]);
  const cropKey = String(result?.crop || "").toLowerCase();
  const cropImage = CROP_IMAGE_MAP[cropKey] || wheatImage;
  const latestCrop = result?.crop || combinedPredictions.find((item) => item.crop_prediction)?.crop_prediction || t("farmer.noPredictionYet");
  const latestCropDisplay = latestCrop === t("farmer.noPredictionYet") ? latestCrop : tv("crops", latestCrop);
  const marketCrop = result?.crop || combinedPredictions.find((item) => item.crop_prediction)?.crop_prediction || "wheat";
  const aiContext = useMemo(
    () => ({
      selectedState,
      selectedSeason,
      form,
      liveWeather,
      result,
      advisory,
      latestCrop: latestCrop === t("farmer.noPredictionYet") ? "" : latestCrop,
      recentPredictions: combinedPredictions.slice(0, 5),
    }),
    [advisory, combinedPredictions, form, latestCrop, liveWeather, result, selectedSeason, selectedState, t]
  );
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[285px,1fr]">
        <Sidebar role={user?.role} moduleItems={tabs} activeModule={activeTab} onModuleChange={setActiveTab} />

        <section className="space-y-6">
          <div className="app-shell ambient-grid overflow-hidden p-5">
            <div className="relative z-10 grid gap-5 xl:grid-cols-[1fr,390px] xl:items-center">
              <div>
                <span className="section-badge">{t("farmer.heroBadge")}</span>
                <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-text-heading sm:text-[2.8rem]">
                  {t("farmer.welcome")}, {user?.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">{t("farmer.intro")}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-surface-border bg-surface-card px-4 py-2 text-text-muted">{t("farmer.state")}: {tv("states", selectedState)}</span>
                  <span className="rounded-full border border-surface-border bg-surface-card px-4 py-2 text-text-muted">{t("farmer.season")}: {tv("seasons", selectedSeason)}</span>
                  <span className="rounded-full border border-accent-300 bg-accent-50 px-4 py-2 text-accent-700">{t("farmer.weatherReady")}: {liveWeather ? t("farmer.yes") : t("farmer.no")}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MetricCard title={t("farmer.role")} value={tv("roles", user?.role || "farmer")} subtitle={t("farmer.roleSubtitle")} accent="accent" />
                <MetricCard title={t("farmer.latestCrop")} value={latestCropDisplay} subtitle={t("farmer.latestCropSubtitle")} accent="success" />
              </div>
            </div>
          </div>

          {activeTab === "crop" ? (
            <div className="tab-panel space-y-6">
              <div className="grid gap-6">
                <section className="surface-card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <span className="section-badge">{t("farmer.workflow")}</span>
                      <h2 className="mt-4 text-3xl font-semibold text-text-heading">{t("farmer.cropFormTitle")}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t("farmer.cropFormSubtitle")}</p>
                    </div>
                    <button type="button" onClick={fetchWeatherForLocation} disabled={weatherLoading} className="theme-button-secondary whitespace-nowrap px-5 py-3">
                      {weatherLoading ? t("farmer.fetchingWeather") : t("farmer.autofillWeather")}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {Object.entries(CROP_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className="surface-card-soft interactive-lift p-3 text-left transition-all duration-200 hover:border-accent-300"
                      >
                        <p className="text-sm font-semibold text-accent-700">{tv("crops", preset.labelKey)}</p>
                        <p className="mt-1 text-xs leading-5 text-text-muted">{t(preset.descriptionKey)}</p>
                      </button>
                    ))}
                  </div>

                  <form className="mt-5 space-y-5" onSubmit={handlePredict}>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-text-heading">{t("farmer.state")}</span>
                        <ThemedSelect
                          value={selectedState}
                          onChange={setSelectedState}
                          options={STATE_OPTIONS.map((stateName) => ({ value: stateName, label: tv("states", stateName) }))}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-text-heading">{t("farmer.season")}</span>
                        <ThemedSelect
                          value={selectedSeason}
                          onChange={setSelectedSeason}
                          options={SEASON_OPTIONS.map((seasonName) => ({
                            value: seasonName,
                            label: tv("seasons", seasonName),
                          }))}
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {FEATURE_FIELDS.map((field) => {
                        const range = FIELD_RANGES[field];
                        const sliderValue = form[field] === "" ? range.fallback : form[field];

                        return (
                          <label key={field} className="surface-card-soft space-y-2 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-text-heading">{tv("features", field)}</span>
                              <span className="rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-800">
                                {form[field] || "-"}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={form[field]}
                              onChange={(event) => handleChange(field, event.target.value)}
                              placeholder={t("farmer.enterField", "Enter {{field}}", { field: tv("features", field) })}
                              className="field-shell"
                            />
                            <input
                              type="range"
                              min={range.min}
                              max={range.max}
                              step={range.step}
                              value={sliderValue}
                              onChange={(event) => handleChange(field, event.target.value)}
                              className="range-shell"
                            />
                            <div className="flex justify-between text-[11px] text-text-subtle">
                              <span>{range.min}</span>
                              <span>{range.max}</span>
                            </div>
                            <p className="text-[11px] leading-4 text-text-subtle">{t(`farmer.helpers.${field}`)}</p>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="submit" disabled={loading} className="theme-button-primary px-6 py-3">
                        {loading ? t("farmer.predicting") : t("farmer.quickPredict")}
                      </button>
                      {loading ? <LoadingSpinner label={t("farmer.runningModels")} /> : null}
                      {!loading && isComplete ? <p className="text-sm text-text-muted">{t("farmer.allInputsReady")}</p> : null}
                    </div>
                  </form>

                  {error ? <p className="mt-5 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p> : null}
                </section>

              </div>

              {result ? (
                <section className="space-y-3">
                  <div className="surface-card p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <span className="section-badge">{t("farmer.generatedAdvisory")}</span>
                        <p className="mt-2 text-xs leading-5 text-text-muted">{t("farmer.advisorySubtitle")}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={printAdvisory} className="theme-button-secondary px-4 py-2.5">{t("farmer.printPdf")}</button>
                      </div>
                    </div>
                  </div>
                  <CropCard crop={result.crop} confidence={result.confidence} irrigation={result.irrigation} imageSrc={cropImage} advisory={advisory} />
                </section>
              ) : (
                <section className="surface-card-highlight p-6">
                  <div className="grid gap-5 lg:grid-cols-[0.85fr,1.15fr] lg:items-center">
                    <div>
                      <span className="section-badge">{t("farmer.noAdvisory")}</span>
                      <h3 className="mt-4 text-2xl font-semibold text-text-heading">{t("farmer.firstReportTitle")}</h3>
                      <p className="mt-3 text-sm leading-7 text-text-muted">
                        {t("farmer.firstReportDesc")}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[t("farmer.fillInputs"), t("farmer.runModel"), t("farmer.downloadReport")].map((step, index) => (
                        <div key={step} className="rounded-2xl border border-surface-border bg-surface-card p-4">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-accent-700">{t("farmer.step")} {index + 1}</p>
                          <p className="mt-2 text-sm font-semibold text-text-heading">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : null}

          {activeTab === "disease" ? <div className="tab-panel"><DiseaseDetector /></div> : null}
          {activeTab === "market" ? <div className="tab-panel"><MarketInsights stateName={selectedState} season={selectedSeason} crop={marketCrop} /></div> : null}
          {activeTab === "ai" ? <div className="tab-panel"><AskAiAssistant context={aiContext} /></div> : null}

          {activeTab === "history" ? (
            <section className="surface-card tab-panel p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="section-badge">{t("farmer.historyEyebrow")}</span>
                  <h2 className="mt-4 text-3xl font-semibold text-text-heading">{t("farmer.historyTitle")}</h2>
                </div>
                <p className="text-sm text-text-muted">{t("farmer.historySubtitle")}</p>
              </div>

              {historyLoading ? (
                <div className="mt-6">
                  <LoadingSkeleton cards={4} rows={2} className="lg:grid-cols-2" />
                </div>
              ) : (
                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  {combinedPredictions.slice(0, 8).map((row, index) => (
                    <div key={`${row.ids?.join("-") || row.id || index}`} className="surface-card-soft interactive-lift p-4 transition-all duration-200 hover:border-accent-200">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-subtle">{row.timestamp || "-"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-text-subtle">{t("farmer.crop")}</p>
                          <p className="mt-1 text-lg font-semibold capitalize text-accent-700">{row.crop_prediction ? tv("crops", row.crop_prediction) : "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-subtle">{t("farmer.irrigation")}</p>
                          <p className="mt-1 text-lg font-semibold text-text-heading">
                            {row.irrigation_prediction !== null && row.irrigation_prediction !== undefined ? Number(row.irrigation_prediction).toFixed(4) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!predictions.length ? <p className="text-sm text-text-muted">{t("farmer.noPredictions")}</p> : null}
                </div>
              )}
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default FarmerDashboard;
