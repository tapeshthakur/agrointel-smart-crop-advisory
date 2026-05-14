import React, { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import LoadingSkeleton from "../components/LoadingSkeleton";
import LoadingSpinner from "../components/LoadingSpinner";
import MetricCard from "../components/MetricCard";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../i18n/LanguageContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function pickMetric(source, keys) {
  for (const key of keys) {
    if (typeof source?.[key] === "number") {
      return source[key];
    }
  }
  return 0;
}

function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total_predictions: 0, user_count: 0 });
  const [modelInfo, setModelInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError("");

        const [statsRes, modelRes, predictionsRes] = await Promise.all([
          api.get("/api/admin/stats"),
          api.get("/api/model-info"),
          api.get("/api/predictions"),
        ]);

        setStats(statsRes.data || { total_predictions: 0, user_count: 0 });
        setModelInfo(modelRes.data || null);
        setPredictions(predictionsRes.data.predictions || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load admin dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const classifier = modelInfo?.classifier_metrics || {};
  const regressor = modelInfo?.regressor_metrics || {};

  const metricData = useMemo(() => {
    const accuracy = pickMetric(classifier, ["test_accuracy", "cv_accuracy_mean"]);
    const f1 = pickMetric(classifier, ["cv_f1_weighted_mean", "test_f1"]);
    const mae = pickMetric(regressor, ["test_mae", "cv_mae_mean"]);
    const r2 = pickMetric(regressor, ["test_r2", "cv_r2_mean"]);

    return { accuracy, f1, mae, r2 };
  }, [classifier, regressor]);

  const cropSummary = useMemo(() => {
    const counters = {};
    predictions.forEach((item) => {
      const key = item.crop_prediction?.trim();
      if (!key) return;
      counters[key] = (counters[key] || 0) + 1;
    });

    const ordered = Object.entries(counters).sort((a, b) => b[1] - a[1]);

    return {
      labels: ordered.map(([label]) => label),
      values: ordered.map(([, value]) => value),
      topCrop: ordered[0]?.[0] || "No crop data",
      topCount: ordered[0]?.[1] || 0,
    };
  }, [predictions]);

  const recentPredictions = useMemo(
    () => predictions.filter((item) => item.crop_prediction || item.irrigation_prediction !== null).slice(0, 6),
    [predictions]
  );

  const metricInsights = useMemo(() => {
    const formatted = [
      { key: "accuracy", label: t("admin.accuracy"), value: metricData.accuracy, better: "higher" },
      { key: "f1", label: t("admin.f1"), value: metricData.f1, better: "higher" },
      { key: "mae", label: "MAE", value: metricData.mae, better: "lower" },
      { key: "r2", label: "R2", value: metricData.r2, better: "higher" },
    ];
    const higherMetrics = formatted.filter((item) => item.better === "higher");
    const bestMetric = [...higherMetrics].sort((a, b) => b.value - a.value)[0] || formatted[0];
    const reviewMetric = [...formatted].sort((a, b) => {
      const left = a.better === "lower" ? a.value : 1 - a.value;
      const right = b.better === "lower" ? b.value : 1 - b.value;
      return right - left;
    })[0] || formatted[0];

    return { formatted, bestMetric, reviewMetric };
  }, [metricData, t]);

  const barData = {
    labels: [t("admin.accuracy"), t("admin.f1"), "MAE", "R2"],
    datasets: [
      {
        label: t("admin.modelMetrics"),
        data: [metricData.accuracy, metricData.f1, metricData.mae, metricData.r2],
        backgroundColor: ["#d7ff7f", "#b8ff3b", "#ffcf70", "#75e9b5"],
        borderRadius: 14,
        borderSkipped: false,
        maxBarThickness: 48,
      },
    ],
  };

  const doughnutData = {
    labels: cropSummary.labels,
    datasets: [
      {
        data: cropSummary.values,
        backgroundColor: ["#d7ff7f", "#b8ff3b", "#75e9b5", "#ffcf70", "#84cc16", "#4ade80"],
        borderColor: "#062418",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#e6fff2",
          boxWidth: 14,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: "#06281b",
        borderColor: "rgba(184, 255, 59, 0.2)",
        borderWidth: 1,
        titleColor: "#f7ffe8",
        bodyColor: "#dff7eb",
      },
    },
    scales: {
      x: {
        ticks: { color: "#cdeede" },
        grid: { color: "rgba(110, 231, 183, 0.08)" },
      },
      y: {
        ticks: { color: "#cdeede" },
        grid: { color: "rgba(110, 231, 183, 0.08)" },
      },
    },
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[285px,1fr]">
        <Sidebar role={user?.role} />

        <section className="space-y-6">
          <div className="app-shell ambient-grid">
            <div className="relative z-10 grid gap-6 xl:grid-cols-[1.2fr,0.8fr] xl:items-end">
              <div>
                <span className="section-badge">Admin Control Center</span>
                <h1 className="mt-4 text-4xl font-bold leading-tight text-emerald-50 sm:text-5xl">{t("admin.title")}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-100/72">{t("admin.subtitle")}</p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-emerald-700/50 bg-emerald-950/45 px-4 py-2 text-emerald-100/78">Current user: {user?.name}</span>
                  <span className="rounded-full border border-lime-300/25 bg-lime-300/8 px-4 py-2 text-lime-200">Top crop tracked: {cropSummary.topCrop}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard title={t("admin.totalPredictions")} value={stats.total_predictions || 0} subtitle="Combined crop and irrigation activity" accent="lime" />
                <MetricCard title={t("admin.userCount")} value={stats.user_count || 0} subtitle="Registered platform users" accent="emerald" />
                <MetricCard title={t("admin.accuracy")} value={metricData.accuracy.toFixed(4)} subtitle="Classifier accuracy benchmark" accent="amber" />
                <MetricCard title={t("admin.f1")} value={metricData.f1.toFixed(4)} subtitle="Weighted model reliability score" accent="lime" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              <LoadingSpinner label={t("admin.loading")} />
              <LoadingSkeleton cards={4} rows={2} className="sm:grid-cols-2 lg:grid-cols-4" />
              <LoadingSkeleton cards={2} rows={4} className="xl:grid-cols-2" />
            </div>
          ) : null}
          {error ? <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

          {!loading && !error ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <MetricCard title="Top predicted crop" value={cropSummary.topCrop} subtitle={`${cropSummary.topCount} saved predictions`} accent="lime" />
                <MetricCard title="Regression MAE" value={metricData.mae.toFixed(4)} subtitle="Lower is better for irrigation error" accent="amber" />
                <MetricCard title="Regression R2" value={metricData.r2.toFixed(4)} subtitle="Closer to 1 means stronger fit" accent="emerald" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                <div className="chart-shell">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <span className="section-badge">{t("admin.modelMetrics")}</span>
                      <h2 className="mt-4 text-2xl font-semibold text-emerald-50">Model performance overview</h2>
                    </div>
                    <p className="text-sm text-emerald-100/62">Classification and regression metrics shown together for viva-ready comparison.</p>
                  </div>
                  <Bar data={barData} options={chartOptions} />
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {metricInsights.formatted.map((metric) => (
                      <div key={metric.key} className="chart-legend-card">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/55">{metric.label}</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-50">{metric.value.toFixed(4)}</p>
                        <p className="mt-1 text-xs text-emerald-100/55">{metric.better === "lower" ? "Lower is better" : "Higher is better"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-shell">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <span className="section-badge">{t("admin.cropDistribution")}</span>
                      <h2 className="mt-4 text-2xl font-semibold text-emerald-50">Crop recommendation share</h2>
                    </div>
                    <p className="text-sm text-emerald-100/62">{t("admin.irrigationExcluded")}</p>
                  </div>

                  {cropSummary.labels.length ? (
                    <>
                      <div className="mx-auto max-w-[360px]">
                        <Doughnut
                          data={doughnutData}
                          options={{
                            cutout: "62%",
                            plugins: {
                              legend: {
                                labels: {
                                  color: "#e6fff2",
                                  boxWidth: 14,
                                  usePointStyle: true,
                                  pointStyle: "circle",
                                  padding: 16,
                                },
                              },
                            },
                          }}
                        />
                      </div>
                      <div className="mt-5 rounded-[1.5rem] border border-lime-300/18 bg-lime-300/8 p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-lime-200">Top recommendation</p>
                        <p className="mt-2 text-xl font-semibold capitalize text-emerald-50">{cropSummary.topCrop}</p>
                        <p className="mt-2 text-sm text-emerald-100/68">{cropSummary.topCount} predictions currently lead the distribution.</p>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="chart-legend-card">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-lime-200">Strongest metric</p>
                          <p className="mt-2 text-lg font-semibold text-emerald-50">{metricInsights.bestMetric.label}</p>
                          <p className="mt-1 text-sm text-emerald-100/62">{metricInsights.bestMetric.value.toFixed(4)}</p>
                        </div>
                        <div className="chart-legend-card">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">Review metric</p>
                          <p className="mt-2 text-lg font-semibold text-emerald-50">{metricInsights.reviewMetric.label}</p>
                          <p className="mt-1 text-sm text-emerald-100/62">Use this to explain improvement scope.</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-100/75">{t("admin.noPredictionData")}</p>
                  )}
                </div>
              </div>

              <div className="chart-shell">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="section-badge">Recent activity</span>
                    <h2 className="mt-4 text-2xl font-semibold text-emerald-50">Latest predictions</h2>
                  </div>
                  <p className="text-sm text-emerald-100/62">Quick snapshot of current recommendation traffic for the platform.</p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {recentPredictions.map((item, index) => (
                    <div key={`${item.id || index}`} className="surface-card-soft interactive-lift p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/55">{item.timestamp || "Recent entry"}</p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs text-emerald-100/52">Crop</p>
                          <p className="mt-1 text-lg font-semibold capitalize text-lime-200">{item.crop_prediction || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-100/52">Irrigation</p>
                          <p className="mt-1 text-lg font-semibold text-emerald-50">
                            {item.irrigation_prediction !== null && item.irrigation_prediction !== undefined
                              ? Number(item.irrigation_prediction).toFixed(4)
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentPredictions.length ? <p className="text-sm text-emerald-100/75">{t("admin.noPredictionData")}</p> : null}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
