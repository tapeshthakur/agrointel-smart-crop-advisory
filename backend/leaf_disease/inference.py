from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List

import numpy as np

from config import settings
from leaf_disease.preprocessing import PreparedLeafImage


LOGGER = logging.getLogger(__name__)
CONFIDENCE_THRESHOLD = float(os.getenv("LEAF_DISEASE_CONFIDENCE_THRESHOLD", "0.40"))
MODEL_HAS_PREPROCESSING = os.getenv("LEAF_DISEASE_MODEL_HAS_PREPROCESSING", "1").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}


class LeafDiseaseModelError(RuntimeError):
    pass


@dataclass(frozen=True)
class ModelArtifacts:
    model_path: Path
    labels_path: Path
    source: str


def _artifact_candidates() -> List[ModelArtifacts]:
    model_dir = settings.ml_dir / "models"
    return [
        ModelArtifacts(
            Path(os.getenv("LEAF_DISEASE_MODEL_PATH", str(model_dir / "leaf_disease_mobilenetv2.keras"))),
            Path(os.getenv("LEAF_DISEASE_LABELS_PATH", str(model_dir / "labels.json"))),
            "PlantVillage full MobileNetV2",
        ),
        ModelArtifacts(
            model_dir / "disease_cnn.keras",
            model_dir / "disease_class_names.json",
            "legacy PlantVillage-style MobileNetV2",
        ),
    ]


def _clean_label(label: str) -> str:
    return (
        str(label)
        .replace("___", " - ")
        .replace("__", " ")
        .replace("_", " ")
        .replace("  ", " ")
        .strip()
    )


def _is_healthy(label: str) -> bool:
    return "healthy" in label.lower()


def _load_labels(path: Path) -> List[str]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return [str(item) for item in raw]
    if isinstance(raw, dict):
        if "classes" in raw and isinstance(raw["classes"], list):
            return [str(item) for item in raw["classes"]]
        ordered = sorted(raw.items(), key=lambda item: int(item[0]) if str(item[0]).isdigit() else str(item[0]))
        return [str(item[1]) for item in ordered]
    raise LeafDiseaseModelError(f"Unsupported labels format in {path}")


def _load_guidance() -> Dict[str, Dict[str, str]]:
    guidance_path = Path(__file__).with_name("treatment_guidance.json")
    return json.loads(guidance_path.read_text(encoding="utf-8"))


def _guidance_for(label: str, guidance: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    if label in guidance:
        return guidance[label]
    normalized = label.lower().replace(" ", "_")
    for key, value in guidance.items():
        if key.lower() == normalized or key.lower().replace(" ", "_") == normalized:
            return value
    return guidance.get("_default", {})


def _softmax(values: np.ndarray) -> np.ndarray:
    values = values.astype(np.float64)
    values = values - np.max(values)
    exp = np.exp(values)
    total = exp.sum()
    return exp / total if total else exp


def _probabilities(raw_predictions: np.ndarray) -> np.ndarray:
    scores = np.asarray(raw_predictions, dtype=np.float64).reshape(-1)
    if scores.size == 0:
        raise LeafDiseaseModelError("Model returned no predictions.")
    if np.any(scores < 0) or np.any(scores > 1.0) or not np.isclose(scores.sum(), 1.0, atol=0.05):
        return _softmax(scores)
    total = scores.sum()
    return scores / total if total else scores


class LeafDiseaseInferenceService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._model: Any | None = None
        self._labels: List[str] = []
        self._guidance = _load_guidance()
        self._artifacts: ModelArtifacts | None = None
        self._tf: Any | None = None
        self._load_error: str | None = None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def warmup(self) -> bool:
        try:
            self._ensure_loaded()
            return True
        except LeafDiseaseModelError as exc:
            LOGGER.warning("Leaf disease model not ready: %s", exc)
            return False

    def _configure_gpu(self, tf: Any) -> None:
        try:
            gpus = tf.config.list_physical_devices("GPU")
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            if gpus:
                LOGGER.info("Leaf disease inference using GPU devices: %s", [gpu.name for gpu in gpus])
            else:
                LOGGER.info("Leaf disease inference using CPU; no GPU device detected.")
        except Exception as exc:
            LOGGER.warning("Could not configure TensorFlow GPU memory growth: %s", exc)

    def _select_artifacts(self) -> ModelArtifacts:
        for candidate in _artifact_candidates():
            if candidate.model_path.exists() and candidate.labels_path.exists():
                return candidate
        searched = ", ".join(str(candidate.model_path) for candidate in _artifact_candidates())
        raise LeafDiseaseModelError(
            "No trained leaf disease model found. Train MobileNetV2 first; searched: " + searched
        )

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        with self._lock:
            if self._model is not None:
                return

            artifacts = self._select_artifacts()
            try:
                import tensorflow as tf

                self._configure_gpu(tf)
                model = tf.keras.models.load_model(artifacts.model_path)
                labels = _load_labels(artifacts.labels_path)
            except Exception as exc:
                self._load_error = str(exc)
                raise LeafDiseaseModelError(f"Could not load leaf disease model: {exc}") from exc

            output_shape = getattr(model, "output_shape", None)
            if output_shape is not None and int(output_shape[-1]) != len(labels):
                raise LeafDiseaseModelError(
                    f"Model output classes ({output_shape[-1]}) do not match labels ({len(labels)})."
                )

            self._tf = tf
            self._model = model
            self._labels = labels
            self._artifacts = artifacts
            self._load_error = None
            LOGGER.info(
                "Loaded leaf disease model once from %s with %s labels (%s).",
                artifacts.model_path,
                len(labels),
                artifacts.source,
            )

    def predict(self, prepared: PreparedLeafImage) -> Dict[str, Any]:
        self._ensure_loaded()
        assert self._model is not None

        batch = prepared.batch
        if not MODEL_HAS_PREPROCESSING:
            assert self._tf is not None
            batch = self._tf.keras.applications.mobilenet_v2.preprocess_input(batch.copy())

        raw = self._model.predict(batch, verbose=0)[0]
        probs = _probabilities(raw)
        top_indices = np.argsort(probs)[-3:][::-1]

        candidates: List[Dict[str, Any]] = []
        for index in top_indices:
            raw_label = self._labels[int(index)]
            confidence = float(probs[int(index)])
            guidance = _guidance_for(raw_label, self._guidance)
            candidates.append(
                {
                    "class_name": raw_label,
                    "label": _clean_label(raw_label),
                    "confidence": round(confidence, 4),
                    "confidence_percent": round(confidence * 100, 2),
                    "description": guidance.get("description", ""),
                    "severity": guidance.get("severity", "unknown"),
                    "treatment": guidance.get("treatment", ""),
                    "is_healthy": _is_healthy(raw_label),
                }
            )

        top = candidates[0]
        if top["confidence"] < CONFIDENCE_THRESHOLD:
            low_guidance = self._guidance.get("_low_confidence", {})
            return {
                "predictions": [
                    {
                        "class_name": "uncertain",
                        "label": "couldn't confidently identify",
                        "confidence": top["confidence"],
                        "confidence_percent": top["confidence_percent"],
                        "description": low_guidance.get("description", ""),
                        "severity": low_guidance.get("severity", "unknown"),
                        "treatment": low_guidance.get("treatment", ""),
                        "candidates": candidates,
                        "is_healthy": False,
                    }
                ],
                "is_healthy": False,
            }

        return {
            "predictions": candidates,
            "is_healthy": bool(top["is_healthy"]),
        }


leaf_disease_service = LeafDiseaseInferenceService()


def warmup_leaf_disease_model() -> bool:
    return leaf_disease_service.warmup()


def predict_leaf_disease(prepared: PreparedLeafImage) -> Dict[str, Any]:
    return leaf_disease_service.predict(prepared)

