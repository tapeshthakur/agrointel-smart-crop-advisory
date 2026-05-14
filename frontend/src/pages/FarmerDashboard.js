import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
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

const FEATURE_FIELDS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];
const FIELD_LABELS = {
  N: "Nitrogen (N)",
  P: "Phosphorus (P)",
  K: "Potassium (K)",
  temperature: "Temperature (C)",
  humidity: "Humidity (%)",
  ph: "Soil pH",
  rainfall: "Rainfall (mm)",
};
const FIELD_HELPERS = {
  N: "Supports leafy growth and crop vigor.",
  P: "Improves root development and early growth.",
  K: "Helps stress tolerance and grain quality.",
  temperature: "Live or manual ambient temperature.",
  humidity: "Relative humidity near your farm.",
  ph: "Ideal agricultural range is around 6.0 to 7.5.",
  rainfall: "Use live rainfall or expected rain in mm.",
};
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
    label: "Wheat",
    description: "Cool season profile with balanced nutrients and moderate rain.",
    values: { N: "52", P: "50", K: "52", temperature: "20", humidity: "68", ph: "6.7", rainfall: "140" },
  },
  rice: {
    label: "Rice",
    description: "Warm, humid conditions with strong rainfall support.",
    values: { N: "90", P: "45", K: "42", temperature: "27", humidity: "84", ph: "6.4", rainfall: "245" },
  },
  maize: {
    label: "Maize",
    description: "Warm conditions with medium rainfall and steady nutrient balance.",
    values: { N: "65", P: "40", K: "40", temperature: "27", humidity: "62", ph: "6.5", rainfall: "145" },
  },
};
const CROP_IMAGE_MAP = { rice: riceImage, paddy: riceImage, wheat: wheatImage, maize: maizeImage, corn: maizeImage };

function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [pdfLoading, setPdfLoading] = useState(false);

  const tabs = [
    { id: "crop", label: t("farmer.cropTab"), eyebrow: t("farmer.cropEyebrow"), description: t("farmer.cropDesc") },
    { id: "disease", label: t("farmer.diseaseTab"), eyebrow: t("farmer.diseaseEyebrow"), description: t("farmer.diseaseDesc") },
    { id: "market", label: t("farmer.marketTab"), eyebrow: t("farmer.marketEyebrow"), description: t("farmer.marketDesc") },
    { id: "history", label: t("farmer.historyTab"), eyebrow: t("farmer.historyEyebrow"), description: t("farmer.historyDesc") },
  ];

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get("/api/predictions");
      setPredictions(response.data.predictions || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load recent predictions.");
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

  const downloadAdvisoryPdf = async () => {
    const report = document.getElementById("advisory-report");
    if (!report) {
      setError(t("farmer.downloadBeforePredict"));
      return;
    }

    try {
      setPdfLoading(true);
      setError("");
      const canvas = await html2canvas(report, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imageHeight - heightLeft);
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`smart-crop-advisory-${String(result?.crop || "report").toLowerCase()}.pdf`);
    } catch (_err) {
      setError(t("farmer.pdfFailed"));
    } finally {
      setPdfLoading(false);
    }
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

  const latestPredictionCount = predictions.length;
  const cropKey = String(result?.crop || "").toLowerCase();
  const cropImage = CROP_IMAGE_MAP[cropKey] || wheatImage;
  const averageConfidence = useMemo(() => {
    const values = predictions
      .map((row) => Number(row.confidence || row.crop_confidence))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return "-";
    const avg = values.reduce((total, value) => total + value, 0) / values.length;
    const normalized = avg <= 1 ? avg * 100 : avg;
    return `${normalized.toFixed(1)}%`;
  }, [predictions]);
  const latestCrop = result?.crop || predictions.find((item) => item.crop_prediction)?.crop_prediction || "No prediction yet";
  const weatherMetrics = liveWeather
    ? [
        { key: "temperature", label: "Temperature", icon: "TEMP", value: liveWeather.temperature, unit: "C", progress: Math.min(100, (Number(liveWeather.temperature) / 45) * 100) },
        { key: "humidity", label: "Humidity", icon: "HUM", value: liveWeather.humidity, unit: "%", progress: Math.min(100, Number(liveWeather.humidity)) },
        { key: "rainfall", label: "Rainfall", icon: "RAIN", value: liveWeather.rainfall, unit: "mm", progress: Math.min(100, (Number(liveWeather.rainfall) / 25) * 100) },
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[285px,1fr]">
        <Sidebar role={user?.role} moduleItems={tabs} activeModule={activeTab} onModuleChange={setActiveTab} />

        <section className="space-y-6">
          <div className="app-shell ambient-grid overflow-hidden">
            <div className="relative z-10 grid gap-6 xl:grid-cols-[1.25fr,0.75fr] xl:items-end">
              <div>
                <span className="section-badge">AI Crop Intelligence</span>
                <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-emerald-50 sm:text-5xl">
                  {t("farmer.welcome")}, {user?.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-100/74">{t("farmer.intro")}</p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-emerald-700/50 bg-emerald-950/45 px-4 py-2 text-emerald-100/80">State: {selectedState}</span>
                  <span className="rounded-full border border-emerald-700/50 bg-emerald-950/45 px-4 py-2 text-emerald-100/80">Season: {selectedSeason}</span>
                  <span className="rounded-full border border-lime-300/25 bg-lime-300/8 px-4 py-2 text-lime-200">Live weather ready: {liveWeather ? "Yes" : "No"}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard title={t("farmer.role")} value={String(user?.role || "farmer").toUpperCase()} subtitle="Access level for the current workspace" accent="amber" />
                <MetricCard title={t("farmer.recentPredictions")} value={latestPredictionCount} subtitle={t("farmer.fetched")} accent="lime" />
                <MetricCard title="Latest crop" value={latestCrop} subtitle="Most recent recommended crop" accent="emerald" />
                <MetricCard title="Average confidence" value={averageConfidence} subtitle="Based on saved crop predictions" accent="lime" />
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
                      <h2 className="mt-4 text-3xl font-semibold text-emerald-50">{t("farmer.cropFormTitle")}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/68">{t("farmer.cropFormSubtitle")}</p>
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
                        className="surface-card-soft interactive-lift p-3 text-left transition-all duration-200 hover:border-lime-300/28"
                      >
                        <p className="text-sm font-semibold text-lime-200">{preset.label}</p>
                        <p className="mt-1 text-xs leading-5 text-emerald-100/68">{preset.description}</p>
                      </button>
                    ))}
                  </div>

                  <form className="mt-5 space-y-5" onSubmit={handlePredict}>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-emerald-100/90">{t("farmer.state")}</span>
                        <ThemedSelect
                          value={selectedState}
                          onChange={setSelectedState}
                          options={STATE_OPTIONS.map((stateName) => ({ value: stateName, label: stateName }))}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-emerald-100/90">{t("farmer.season")}</span>
                        <ThemedSelect
                          value={selectedSeason}
                          onChange={setSelectedSeason}
                          options={SEASON_OPTIONS.map((seasonName) => ({
                            value: seasonName,
                            label: seasonName === "Auto" ? t("farmer.auto") : seasonName,
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
                              <span className="text-sm font-medium text-emerald-100/90">{FIELD_LABELS[field]}</span>
                              <span className="rounded-full border border-lime-300/15 bg-lime-300/8 px-3 py-1 text-xs font-semibold text-lime-100">
                                {form[field] || "-"}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={form[field]}
                              onChange={(event) => handleChange(field, event.target.value)}
                              placeholder={`Enter ${FIELD_LABELS[field]}`}
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
                            <div className="flex justify-between text-[11px] text-emerald-100/45">
                              <span>{range.min}</span>
                              <span>{range.max}</span>
                            </div>
                            <p className="text-[11px] leading-4 text-emerald-100/48">{FIELD_HELPERS[field]}</p>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="submit" disabled={loading} className="theme-button-primary px-6 py-3">
                        {loading ? t("farmer.predicting") : t("farmer.quickPredict")}
                      </button>
                      {loading ? <LoadingSpinner label="Running crop and irrigation models..." /> : null}
                      {!loading && isComplete ? <p className="text-sm text-emerald-100/60">All model inputs are ready.</p> : null}
                    </div>
                  </form>

                  {error ? <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
                </section>

                <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                  <section className="surface-card-highlight p-5">
                    <span className="section-badge">Decision Summary</span>
                    <h3 className="mt-4 text-2xl font-semibold text-emerald-50">Field readiness</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/76">
                      Use the preset cards for quick demos, then switch to manual values to explain how soil nutrients and weather shift the recommendation.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0 rounded-[1.3rem] border border-emerald-700/40 bg-emerald-950/55 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">Selected state</p>
                        <p className="mt-2 truncate text-base font-semibold text-emerald-50 sm:text-lg" title={selectedState}>{selectedState}</p>
                      </div>
                      <div className="min-w-0 rounded-[1.3rem] border border-emerald-700/40 bg-emerald-950/55 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">Selected season</p>
                        <p className="mt-2 truncate text-base font-semibold text-emerald-50 sm:text-lg" title={selectedSeason}>{selectedSeason}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[1.4rem] border border-lime-300/20 bg-lime-300/8 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-lime-200">Model inputs used</p>
                      <p className="mt-2 text-sm leading-7 text-emerald-100/74">N, P, K, soil pH, temperature, humidity, and rainfall are combined to drive both crop prediction and irrigation guidance.</p>
                    </div>
                  </section>

                  <section className="surface-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="section-badge">{t("farmer.liveWeather")}</span>
                        <h3 className="mt-4 text-2xl font-semibold text-emerald-50">Weather snapshot</h3>
                      </div>
                      <span className="rounded-full border border-emerald-700/50 px-3 py-1 text-xs text-emerald-100/65">
                        {liveWeather?.source || "Manual"}
                      </span>
                    </div>

                    {liveWeather ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {weatherMetrics.map((metric) => (
                          <div key={metric.key} className="surface-card-soft p-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-[10px] font-bold text-lime-100">
                                {metric.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">{metric.label}</p>
                                  <p className="text-lg font-semibold text-emerald-50">{metric.value} {metric.unit}</p>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-emerald-900/80">
                                  <div className="h-2 rounded-full bg-lime-300" style={{ width: `${metric.progress}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-[1.4rem] border border-dashed border-emerald-700/60 bg-emerald-950/35 p-5 text-sm leading-7 text-emerald-100/66">
                        {t("farmer.noWeatherYet")}
                      </div>
                    )}

                    <div className="mt-5 rounded-[1.4rem] border border-amber-300/16 bg-amber-300/8 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">Demo tip</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/75">Start with a preset, fetch live weather, and then slightly change pH or rainfall to show how the recommendation reacts.</p>
                    </div>
                  </section>
                </div>
              </div>

              {result ? (
                <section className="space-y-3">
                  <div className="surface-card p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <span className="section-badge">{t("farmer.generatedAdvisory")}</span>
                        <p className="mt-3 text-sm leading-6 text-emerald-100/70">{t("farmer.advisorySubtitle")}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={printAdvisory} className="theme-button-secondary px-4 py-3">{t("farmer.printPdf")}</button>
                        <button type="button" onClick={downloadAdvisoryPdf} disabled={pdfLoading} className="theme-button-primary px-4 py-3">
                          {pdfLoading ? t("farmer.preparingPdf") : t("farmer.downloadPdf")}
                        </button>
                      </div>
                    </div>
                  </div>
                  <CropCard crop={result.crop} confidence={result.confidence} irrigation={result.irrigation} imageSrc={cropImage} advisory={advisory} />
                </section>
              ) : (
                <section className="surface-card-highlight p-6">
                  <div className="grid gap-5 lg:grid-cols-[0.85fr,1.15fr] lg:items-center">
                    <div>
                      <span className="section-badge">No advisory yet</span>
                      <h3 className="mt-4 text-2xl font-semibold text-emerald-50">Generate your first crop report</h3>
                      <p className="mt-3 text-sm leading-7 text-emerald-100/76">
                        Fill the field values or use a preset, then run prediction to create a complete advisory report with crop, irrigation, fertilizer, season fit, and comparison results.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Fill inputs", "Run ML model", "Download report"].map((step, index) => (
                        <div key={step} className="rounded-2xl border border-emerald-700/40 bg-emerald-950/60 p-4">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-lime-200">Step {index + 1}</p>
                          <p className="mt-2 text-sm font-semibold text-emerald-50">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : null}

          {activeTab === "disease" ? <div className="tab-panel"><DiseaseDetector /></div> : null}
          {activeTab === "market" ? <div className="tab-panel"><MarketInsights stateName={selectedState} season={selectedSeason} crop={result?.crop || "wheat"} /></div> : null}

          {activeTab === "history" ? (
            <section className="surface-card tab-panel p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="section-badge">Saved activity</span>
                  <h2 className="mt-4 text-3xl font-semibold text-emerald-50">{t("farmer.historyTitle")}</h2>
                </div>
                <p className="text-sm text-emerald-100/62">Recent crop and irrigation outputs stored for this account.</p>
              </div>

              {historyLoading ? (
                <div className="mt-6">
                  <LoadingSkeleton cards={4} rows={2} className="lg:grid-cols-2" />
                </div>
              ) : (
                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  {predictions.slice(0, 8).map((row, index) => (
                    <div key={`${row.id || index}`} className="surface-card-soft interactive-lift p-4 transition-all duration-200 hover:border-lime-300/20">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/55">{row.timestamp || "-"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-emerald-100/52">{t("farmer.crop")}</p>
                          <p className="mt-1 text-lg font-semibold capitalize text-lime-200">{row.crop_prediction || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-100/52">{t("farmer.irrigation")}</p>
                          <p className="mt-1 text-lg font-semibold text-emerald-50">
                            {row.irrigation_prediction !== null && row.irrigation_prediction !== undefined ? Number(row.irrigation_prediction).toFixed(4) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!predictions.length ? <p className="text-sm text-emerald-100/75">{t("farmer.noPredictions")}</p> : null}
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
