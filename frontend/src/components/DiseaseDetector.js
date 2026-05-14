import React, { useEffect, useState } from "react";
import api from "../api/client";
import LoadingSpinner from "./LoadingSpinner";
import { useLanguage } from "../i18n/LanguageContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

function DiseaseDetector() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [file]);

  const chooseFile = (nextFile) => {
    setError("");
    setResult(null);

    if (!nextFile) return;
    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      setError(t("disease.badType"));
      return;
    }
    if (nextFile.size > MAX_IMAGE_SIZE) {
      setError(t("disease.bigFile"));
      return;
    }

    setFile(nextFile);
  };

  const detectDisease = async () => {
    if (!file) {
      setError(t("disease.selectFile"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/api/disease/detect", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(response.data.result || null);
    } catch (err) {
      setError(err.response?.data?.error || t("disease.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card p-6">
      <div className="mb-6 flex flex-col gap-2">
        <span className="section-badge">{t("disease.module")}</span>
        <h2 className="text-3xl font-semibold text-emerald-50">{t("disease.title")}</h2>
        <p className="max-w-2xl text-sm leading-6 text-emerald-100/68">{t("disease.subtitle")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            chooseFile(event.dataTransfer.files?.[0]);
          }}
          className={[
            "flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-[1.7rem] border-2 border-dashed p-6 text-center transition-all duration-200",
            dragging
              ? "border-lime-300 bg-lime-300/10"
              : "border-emerald-700/65 bg-gradient-to-b from-emerald-900/35 to-emerald-950/45 hover:border-lime-300/45",
          ].join(" ")}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Leaf preview" className="h-72 w-full rounded-[1.4rem] object-cover shadow-xl shadow-black/20" />
          ) : (
            <div>
              <p className="text-xl font-semibold text-emerald-50">{t("disease.drop")}</p>
              <p className="mt-3 text-sm leading-6 text-emerald-100/68">{t("disease.browse")}</p>
            </div>
          )}
          <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
        </label>

        <div className="surface-card-soft p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-emerald-50">{t("disease.result")}</h3>
              <p className="mt-1 text-sm text-emerald-100/62">{t("disease.resultSubtitle")}</p>
            </div>
            <button type="button" onClick={detectDisease} disabled={loading || !file} className="theme-button-primary px-4 py-3 disabled:opacity-60">
              {t("disease.detect")}
            </button>
          </div>

          {loading ? <div className="mt-5"><LoadingSpinner label={t("disease.analysing")} /></div> : null}
          {error ? <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

          {result ? (
            <div className="mt-5 space-y-4">
              <div className="surface-card-highlight p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-lime-200">{t("disease.predicted")}</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-3xl font-bold text-emerald-50">{result.disease}</p>
                  <p className="rounded-full border border-lime-300/18 bg-lime-300/12 px-3 py-1 text-sm font-semibold text-lime-200">
                    {Number(result.confidence).toFixed(2)}% confidence
                  </p>
                </div>
                <p className="mt-3 text-sm capitalize text-emerald-100/74">{t("disease.severity")}: {result.severity}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-emerald-700/40 bg-emerald-950/60 p-4">
                  <p className="text-sm font-semibold text-emerald-50">{t("disease.treatment")}</p>
                  <p className="mt-2 text-sm leading-7 text-emerald-100/74">{result.treatment}</p>
                </div>
                <div className="rounded-[1.35rem] border border-emerald-700/40 bg-emerald-950/60 p-4">
                  <p className="text-sm font-semibold text-emerald-50">{t("disease.prevention")}</p>
                  <p className="mt-2 text-sm leading-7 text-emerald-100/74">{result.prevention}</p>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-emerald-700/40 bg-emerald-950/60 p-4">
                <p className="text-sm font-semibold text-emerald-50">{t("disease.topMatches")}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {result.top_3?.map(([name, score]) => (
                    <div key={name} className="rounded-2xl border border-emerald-700/30 bg-emerald-900/55 p-3">
                      <p className="text-xs leading-5 text-emerald-100/70">{name}</p>
                      <p className="mt-1 text-base font-semibold text-lime-200">{Number(score).toFixed(2)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs leading-6 text-emerald-100/48">{result.model_note}</p>
            </div>
          ) : (
            <p className="mt-5 rounded-[1.35rem] border border-dashed border-emerald-700/60 bg-emerald-950/35 p-5 text-sm leading-7 text-emerald-100/68">
              {t("disease.helper")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default DiseaseDetector;
