from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from PIL import Image, ImageOps

from config import settings


@dataclass(frozen=True)
class DiseaseProfile:
    name: str
    treatment: str
    prevention: str
    next_steps: Tuple[str, ...]


DISEASE_PROFILES = {
    "Healthy Leaf": DiseaseProfile(
        name="Healthy Leaf",
        treatment="No chemical treatment required. Continue regular field monitoring.",
        prevention="Maintain balanced irrigation, good spacing, and periodic nutrient checks.",
        next_steps=(
            "Keep observing the crop every 3 to 4 days.",
            "Maintain balanced watering and avoid unnecessary pesticide spray.",
        ),
    ),
    "Leaf Spot / Blight": DiseaseProfile(
        name="Leaf Spot / Blight",
        treatment="Remove badly infected leaves and apply Mancozeb or Copper Oxychloride as advised locally.",
        prevention="Avoid overhead irrigation, improve air circulation, and do not leave infected residue in the field.",
        next_steps=(
            "Remove and destroy heavily infected leaves.",
            "Avoid watering leaves directly.",
            "Confirm fungicide dose with a local agriculture officer.",
        ),
    ),
    "Yellowing / Nutrient Stress": DiseaseProfile(
        name="Yellowing / Nutrient Stress",
        treatment="Check nitrogen and micronutrient deficiency. Apply compost or recommended fertilizer after soil testing.",
        prevention="Use balanced NPK doses and avoid waterlogging because roots cannot absorb nutrients properly.",
        next_steps=(
            "Check soil moisture and drainage first.",
            "Use a soil test before adding extra fertilizer.",
            "Inspect nearby plants for similar yellowing.",
        ),
    ),
    "Rust / Fungal Infection": DiseaseProfile(
        name="Rust / Fungal Infection",
        treatment="Use a suitable fungicide such as Propiconazole after confirming with an agricultural officer.",
        prevention="Use resistant varieties, avoid dense planting, and monitor during humid weather.",
        next_steps=(
            "Separate badly affected leaves from healthy plants.",
            "Improve airflow around plants.",
            "Ask local extension support before spraying fungicide.",
        ),
    ),
    "Leaf Scorch / Dry Stress": DiseaseProfile(
        name="Leaf Scorch / Dry Stress",
        treatment="Provide light irrigation and remove severely dried leaves if infection spreads.",
        prevention="Mulch the soil, avoid afternoon irrigation, and maintain steady moisture during hot spells.",
        next_steps=(
            "Check whether the soil is too dry or too hot.",
            "Irrigate lightly in the morning or evening.",
            "Use mulch to reduce moisture loss.",
        ),
    ),
}

_CNN_MODEL = None
_CNN_CLASS_NAMES: List[str] | None = None
INVALID_CLASS_NAMES = {"plantvillage"}
SUPPORTED_PLANTS = {"pepper bell", "potato", "tomato"}
CNN_IMAGE_SIZE = (224, 224)
MIN_CONFIDENT_MARGIN = 12.0


def _percentage(mask: np.ndarray) -> float:
    return round(float(mask.mean() * 100), 2)


def _top_three(scores: Dict[str, float]) -> List[Tuple[str, float]]:
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:3]


def _model_paths() -> Tuple[Path, Path]:
    model_dir = settings.ml_dir / "models"
    return model_dir / "disease_cnn.keras", model_dir / "disease_class_names.json"


def _clean_class_name(class_name: str) -> str:
    return class_name.replace("___", " - ").replace("__", " - ").replace("_", " ").strip()


def _split_plant_condition(class_name: str) -> Tuple[str, str]:
    raw = str(class_name or "").strip()
    if "___" in raw:
        plant_raw, condition_raw = raw.split("___", 1)
        plant = plant_raw.replace("__", " ").replace("_", " ")
        condition = condition_raw.replace("__", " ").replace("_", " ")
    elif raw.startswith("Tomato_"):
        plant = "Tomato"
        condition = raw.removeprefix("Tomato_").replace("__", " ").replace("_", " ")
    else:
        cleaned = _clean_class_name(raw)
        parts = cleaned.split(maxsplit=1)
        plant = parts[0] if parts else "Unknown"
        condition = parts[1] if len(parts) > 1 else cleaned

    plant = plant.replace("Pepper  bell", "Pepper bell")
    condition = condition.replace("Tomato YellowLeaf  Curl Virus", "Tomato Yellow Leaf Curl Virus")
    condition = condition.replace("Two spotted spider mite", "Two-spotted spider mite")
    return plant.strip().title(), condition.strip().replace("  ", " ").title()


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
        next_steps=(
            "Take a clearer close-up photo if the confidence is low.",
            "Compare symptoms with nearby plants.",
            "Confirm treatment with local extension support.",
        ),
    )


def _confidence_status(confidence: float) -> str:
    if confidence >= 80:
        return "high"
    if confidence >= 55:
        return "medium"
    return "low"


def _upload_quality(arr: np.ndarray) -> Dict[str, Any]:
    red = arr[:, :, 0]
    green = arr[:, :, 1]
    blue = arr[:, :, 2]
    brightness = arr.mean(axis=2)
    gray = brightness.astype(np.float32)
    greenish_mask = (green > red * 1.04) & (green > blue * 1.04) & (green > 45)
    yellowish_mask = (red > 100) & (green > 90) & (blue < 120)
    leaf_like_pct = _percentage(greenish_mask | yellowish_mask)
    brightness_mean = round(float(brightness.mean()), 2)
    height, width = arr.shape[:2]
    if height > 1 and width > 1:
        focus_score = round(
            float(np.var(np.diff(gray, axis=0)) + np.var(np.diff(gray, axis=1))),
            2,
        )
    else:
        focus_score = 0.0
    aspect_ratio = round(float(max(width, height) / max(1, min(width, height))), 2)

    warnings: List[str] = []
    if min(width, height) < 160:
        warnings.append("Image resolution is low. Upload a larger close-up leaf photo.")
    if aspect_ratio > 3.2:
        warnings.append("Image is too narrow or wide. Crop around one leaf before uploading.")
    if leaf_like_pct < 8:
        warnings.append("Leaf area is low. Upload a closer photo of a single leaf.")
    if brightness_mean < 45:
        warnings.append("Image is too dark. Take the photo in better light.")
    if brightness_mean > 225:
        warnings.append("Image is too bright. Avoid flash or harsh sunlight.")
    if focus_score < 18:
        warnings.append("Image appears blurry. Retake the photo with a steady camera.")

    return {
        "leaf_area_percent": leaf_like_pct,
        "brightness": brightness_mean,
        "focus_score": focus_score,
        "aspect_ratio": aspect_ratio,
        "warnings": warnings,
        "is_usable": not warnings,
    }


def _leaf_mask(arr: np.ndarray) -> np.ndarray:
    red = arr[:, :, 0]
    green = arr[:, :, 1]
    blue = arr[:, :, 2]
    brightness = arr.mean(axis=2)
    green_mask = (green > red * 1.03) & (green > blue * 1.03) & (green > 40)
    yellow_mask = (red > 95) & (green > 85) & (blue < 135) & (np.abs(red - green) < 95)
    brown_mask = (red > 55) & (green > 30) & (blue < 115) & (red > green * 1.05) & (brightness > 30)
    return green_mask | yellow_mask | brown_mask


def _leaf_crop(image: Image.Image) -> Image.Image | None:
    probe = image.copy()
    probe.thumbnail((360, 360))
    arr = np.asarray(probe).astype(np.float32)
    mask = _leaf_mask(arr)
    if mask.mean() < 0.08:
        return None

    ys, xs = np.where(mask)
    if not len(xs) or not len(ys):
        return None

    scale_x = image.width / probe.width
    scale_y = image.height / probe.height
    pad_x = max(16, int((xs.max() - xs.min()) * 0.16))
    pad_y = max(16, int((ys.max() - ys.min()) * 0.16))
    left = max(0, int((xs.min() - pad_x) * scale_x))
    top = max(0, int((ys.min() - pad_y) * scale_y))
    right = min(image.width, int((xs.max() + pad_x) * scale_x))
    bottom = min(image.height, int((ys.max() + pad_y) * scale_y))
    if right - left < 80 or bottom - top < 80:
        return None
    return image.crop((left, top, right, bottom))


def _center_square_crop(image: Image.Image) -> Image.Image:
    side = min(image.width, image.height)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side))


def _cnn_input_variants(image: Image.Image) -> np.ndarray:
    variants = [image, ImageOps.mirror(image), _center_square_crop(image)]
    leaf_crop = _leaf_crop(image)
    if leaf_crop is not None:
        variants.extend([leaf_crop, ImageOps.mirror(leaf_crop)])

    arrays = []
    seen_sizes = set()
    for variant in variants:
        resized = variant.resize(CNN_IMAGE_SIZE)
        arr = np.asarray(resized).astype(np.float32)
        key = (variant.size, int(arr.mean()), int(arr.std()))
        if key in seen_sizes:
            continue
        seen_sizes.add(key)
        arrays.append(arr)

    return np.stack(arrays, axis=0)


def _normalise_prediction_scores(predictions: np.ndarray, class_names: List[str]) -> np.ndarray:
    scores = np.asarray(predictions, dtype=np.float64).copy()
    for index, class_name in enumerate(class_names):
        if class_name.strip().lower() in INVALID_CLASS_NAMES:
            scores[index] = 0.0

    total = float(scores.sum())
    if total <= 0:
        return scores
    return scores / total


def _result_payload(
    disease: str,
    confidence: float,
    severity: str,
    treatment: str,
    prevention: str,
    top_3: List[Tuple[str, float]],
    model_note: str,
    plant: str = "Unknown",
    condition: str | None = None,
    upload_quality: Dict[str, Any] | None = None,
    observations: Dict[str, Any] | None = None,
    next_steps: Tuple[str, ...] | List[str] | None = None,
    prediction_margin: float | None = None,
) -> Dict[str, Any]:
    confidence_status = _confidence_status(confidence)
    quality_warnings = upload_quality.get("warnings", []) if upload_quality else []
    low_margin = prediction_margin is not None and prediction_margin < MIN_CONFIDENT_MARGIN
    needs_review = confidence_status == "low" or low_margin or bool(quality_warnings)

    return {
        "disease": disease,
        "plant": plant,
        "condition": condition or disease,
        "confidence": round(float(confidence), 2),
        "confidence_status": confidence_status,
        "prediction_margin": round(float(prediction_margin), 2) if prediction_margin is not None else None,
        "needs_review": needs_review,
        "severity": severity,
        "treatment": treatment,
        "prevention": prevention,
        "next_steps": list(next_steps or []),
        "top_3": top_3,
        "observations": observations or {},
        "upload_quality": upload_quality or {},
        "supported_plants": sorted(SUPPORTED_PLANTS),
        "model_note": model_note,
    }


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
        original = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
        quality_arr = np.asarray(original.resize((320, 320))).astype(np.float32)
        upload_quality = _upload_quality(quality_arr)
        batch = _cnn_input_variants(original)
        predictions = _normalise_prediction_scores(model.predict(batch, verbose=0).mean(axis=0), class_names)
    except Exception:
        return None

    top_indices = np.argsort(predictions)[-3:][::-1]
    best_index = int(top_indices[0])
    second_index = int(top_indices[1]) if len(top_indices) > 1 else best_index
    raw_class = class_names[best_index]
    confidence = round(float(predictions[best_index] * 100), 2)
    prediction_margin = round(float((predictions[best_index] - predictions[second_index]) * 100), 2)
    profile = _profile_for_class(raw_class)
    disease_label = _clean_class_name(raw_class)
    plant, condition = _split_plant_condition(raw_class)
    is_healthy = "healthy" in raw_class.lower()

    if is_healthy:
        severity = "low"
    elif confidence >= 80:
        severity = "high"
    elif confidence >= 55:
        severity = "medium"
    else:
        severity = "low"

    return _result_payload(
        disease=disease_label,
        plant=plant,
        condition=condition,
        confidence=confidence,
        severity=severity,
        treatment=profile.treatment,
        prevention=profile.prevention,
        next_steps=profile.next_steps,
        top_3=[
            (_clean_class_name(class_names[int(index)]), round(float(predictions[int(index)] * 100), 2))
            for index in top_indices
        ],
        observations={},
        upload_quality=upload_quality,
        prediction_margin=prediction_margin,
        model_note="MobileNetV2 CNN trained on PlantVillage-style leaf disease classes.",
    )


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

    image = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    image.thumbnail((320, 320))
    arr = np.asarray(image).astype(np.float32)
    upload_quality = _upload_quality(arr)
    fallback_reason = "Lightweight image-analysis fallback; replaceable with a trained PlantVillage CNN model."

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
    prediction_margin = confidence - (top3[1][1] if len(top3) > 1 else 0)
    profile = DISEASE_PROFILES[disease_name]

    severity = "low"
    if disease_name != "Healthy Leaf":
        if confidence >= 70 or lesion_pct >= 25:
            severity = "high"
        elif confidence >= 45 or lesion_pct >= 12:
            severity = "medium"

    return _result_payload(
        disease=profile.name,
        plant="Unknown",
        condition=profile.name,
        confidence=round(float(max(35.0, min(98.0, confidence))), 2),
        severity=severity,
        treatment=profile.treatment,
        prevention=profile.prevention,
        next_steps=profile.next_steps,
        top_3=[(name, round(float(score), 2)) for name, score in top3],
        observations={
            "green_area_percent": green_pct,
            "yellowing_percent": yellow_pct,
            "brown_spot_percent": brown_pct,
            "dark_spot_percent": dark_pct,
        },
        upload_quality=upload_quality,
        prediction_margin=prediction_margin,
        model_note=fallback_reason,
    )
