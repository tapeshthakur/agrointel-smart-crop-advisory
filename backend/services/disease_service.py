from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from PIL import Image

from config import settings


@dataclass(frozen=True)
class DiseaseProfile:
    name: str
    treatment: str
    prevention: str


DISEASE_PROFILES = {
    "Healthy Leaf": DiseaseProfile(
        name="Healthy Leaf",
        treatment="No chemical treatment required. Continue regular field monitoring.",
        prevention="Maintain balanced irrigation, good spacing, and periodic nutrient checks.",
    ),
    "Leaf Spot / Blight": DiseaseProfile(
        name="Leaf Spot / Blight",
        treatment="Remove badly infected leaves and apply Mancozeb or Copper Oxychloride as advised locally.",
        prevention="Avoid overhead irrigation, improve air circulation, and do not leave infected residue in the field.",
    ),
    "Yellowing / Nutrient Stress": DiseaseProfile(
        name="Yellowing / Nutrient Stress",
        treatment="Check nitrogen and micronutrient deficiency. Apply compost or recommended fertilizer after soil testing.",
        prevention="Use balanced NPK doses and avoid waterlogging because roots cannot absorb nutrients properly.",
    ),
    "Rust / Fungal Infection": DiseaseProfile(
        name="Rust / Fungal Infection",
        treatment="Use a suitable fungicide such as Propiconazole after confirming with an agricultural officer.",
        prevention="Use resistant varieties, avoid dense planting, and monitor during humid weather.",
    ),
    "Leaf Scorch / Dry Stress": DiseaseProfile(
        name="Leaf Scorch / Dry Stress",
        treatment="Provide light irrigation and remove severely dried leaves if infection spreads.",
        prevention="Mulch the soil, avoid afternoon irrigation, and maintain steady moisture during hot spells.",
    ),
}

_CNN_MODEL = None
_CNN_CLASS_NAMES: List[str] | None = None


def _percentage(mask: np.ndarray) -> float:
    return round(float(mask.mean() * 100), 2)


def _top_three(scores: Dict[str, float]) -> List[Tuple[str, float]]:
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:3]


def _model_paths() -> Tuple[Path, Path]:
    model_dir = settings.ml_dir / "models"
    return model_dir / "disease_cnn.keras", model_dir / "disease_class_names.json"


def _clean_class_name(class_name: str) -> str:
    return class_name.replace("___", " - ").replace("__", " - ").replace("_", " ").strip()


def _profile_for_class(class_name: str) -> DiseaseProfile:
    lowered = class_name.lower()
    if "healthy" in lowered:
        return DISEASE_PROFILES["Healthy Leaf"]
    if "rust" in lowered:
        return DISEASE_PROFILES["Rust / Fungal Infection"]
    if "blight" in lowered or "spot" in lowered or "scab" in lowered or "rot" in lowered:
        return DISEASE_PROFILES["Leaf Spot / Blight"]
    if "yellow" in lowered or "mosaic" in lowered or "virus" in lowered:
        return DISEASE_PROFILES["Yellowing / Nutrient Stress"]
    if "scorch" in lowered or "dry" in lowered:
        return DISEASE_PROFILES["Leaf Scorch / Dry Stress"]
    return DiseaseProfile(
        name=_clean_class_name(class_name),
        treatment="Isolate affected plants if symptoms spread and consult a local agricultural extension officer.",
        prevention="Use clean planting material, rotate crops, and inspect leaves weekly during humid weather.",
    )


def _load_cnn_model():
    global _CNN_MODEL, _CNN_CLASS_NAMES

    if _CNN_MODEL is not None and _CNN_CLASS_NAMES is not None:
        return _CNN_MODEL, _CNN_CLASS_NAMES

    model_path, class_names_path = _model_paths()
    if not model_path.exists() or not class_names_path.exists():
        return None, None

    try:
        import tensorflow as tf

        _CNN_MODEL = tf.keras.models.load_model(model_path)
        _CNN_CLASS_NAMES = json.loads(class_names_path.read_text(encoding="utf-8"))
        return _CNN_MODEL, _CNN_CLASS_NAMES
    except Exception:
        _CNN_MODEL = None
        _CNN_CLASS_NAMES = None
        return None, None


def _predict_with_cnn(image_bytes: bytes) -> Dict[str, Any] | None:
    model, class_names = _load_cnn_model()
    if model is None or not class_names:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        arr = np.expand_dims(np.asarray(image).astype(np.float32), axis=0)
        predictions = model.predict(arr, verbose=0)[0]
    except Exception:
        return None

    top_indices = np.argsort(predictions)[-3:][::-1]
    best_index = int(top_indices[0])
    raw_class = class_names[best_index]
    confidence = round(float(predictions[best_index] * 100), 2)
    profile = _profile_for_class(raw_class)
    disease_label = _clean_class_name(raw_class)
    is_healthy = "healthy" in raw_class.lower()

    if is_healthy:
        severity = "low"
    elif confidence >= 80:
        severity = "high"
    elif confidence >= 55:
        severity = "medium"
    else:
        severity = "low"

    return {
        "disease": disease_label,
        "confidence": confidence,
        "severity": severity,
        "treatment": profile.treatment,
        "prevention": profile.prevention,
        "top_3": [
            (_clean_class_name(class_names[int(index)]), round(float(predictions[int(index)] * 100), 2))
            for index in top_indices
        ],
        "observations": {},
        "model_note": "MobileNetV2 CNN trained on PlantVillage-style leaf disease classes.",
    }


def analyse_leaf_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Leaf disease inference.

    If a trained CNN exists at ml/models/disease_cnn.keras, it is used.
    Otherwise, the service falls back to lightweight colour/texture analysis so
    the app still works on machines without TensorFlow.
    """
    cnn_result = _predict_with_cnn(image_bytes)
    if cnn_result is not None:
        return cnn_result

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image.thumbnail((320, 320))
    arr = np.asarray(image).astype(np.float32)

    red = arr[:, :, 0]
    green = arr[:, :, 1]
    blue = arr[:, :, 2]
    brightness = arr.mean(axis=2)

    yellow_mask = (red > 120) & (green > 105) & (blue < 105) & (np.abs(red - green) < 70)
    brown_mask = (red > 80) & (green > 45) & (green < 130) & (blue < 95) & (red > green * 1.08)
    dark_spot_mask = brightness < 55
    green_mask = (green > red * 1.08) & (green > blue * 1.08) & (green > 70)
    dry_mask = (red > 135) & (green > 95) & (blue < 80) & (red > green * 1.15)

    yellow_pct = _percentage(yellow_mask)
    brown_pct = _percentage(brown_mask)
    dark_pct = _percentage(dark_spot_mask)
    green_pct = _percentage(green_mask)
    dry_pct = _percentage(dry_mask)
    lesion_pct = min(100.0, brown_pct + dark_pct * 0.7)

    scores = {
        "Healthy Leaf": max(5.0, min(96.0, green_pct - lesion_pct * 0.65 - yellow_pct * 0.35)),
        "Leaf Spot / Blight": min(96.0, lesion_pct * 1.7 + dark_pct * 0.6),
        "Yellowing / Nutrient Stress": min(96.0, yellow_pct * 2.2 + max(0.0, 45.0 - green_pct) * 0.5),
        "Rust / Fungal Infection": min(96.0, brown_pct * 2.1 + yellow_pct * 0.3),
        "Leaf Scorch / Dry Stress": min(96.0, dry_pct * 2.4 + max(0.0, 55.0 - green_pct) * 0.25),
    }

    if green_pct > 48 and lesion_pct < 7 and yellow_pct < 12:
        scores["Healthy Leaf"] += 18

    top3 = _top_three(scores)
    disease_name, confidence = top3[0]
    profile = DISEASE_PROFILES[disease_name]

    severity = "low"
    if disease_name != "Healthy Leaf":
        if confidence >= 70 or lesion_pct >= 25:
            severity = "high"
        elif confidence >= 45 or lesion_pct >= 12:
            severity = "medium"

    return {
        "disease": profile.name,
        "confidence": round(float(max(35.0, min(98.0, confidence))), 2),
        "severity": severity,
        "treatment": profile.treatment,
        "prevention": profile.prevention,
        "top_3": [(name, round(float(score), 2)) for name, score in top3],
        "observations": {
            "green_area_percent": green_pct,
            "yellowing_percent": yellow_pct,
            "brown_spot_percent": brown_pct,
            "dark_spot_percent": dark_pct,
        },
        "model_note": "Lightweight image-analysis fallback; replaceable with a trained PlantVillage CNN model.",
    }
