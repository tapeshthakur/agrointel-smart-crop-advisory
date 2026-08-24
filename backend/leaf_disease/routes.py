from __future__ import annotations

import hashlib
import logging
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from flask import Blueprint, jsonify, request

from leaf_disease import inference
from leaf_disease.preprocessing import (
    LeafDiseaseUploadError,
    MAX_IMAGE_BYTES,
    prepare_leaf_image,
)


LOGGER = logging.getLogger(__name__)
leaf_disease_bp = Blueprint("leaf_disease_bp", __name__)

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 20
_rate_limit_hits: Dict[str, Deque[float]] = defaultdict(deque)


def _error(code: str, message: str, status_code: int):
    return jsonify({"error": {"code": code, "message": message}}), status_code


def _client_key() -> str:
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.remote_addr or "unknown"


def _rate_limited() -> bool:
    now = time.monotonic()
    key = _client_key()
    hits = _rate_limit_hits[key]
    while hits and now - hits[0] > RATE_LIMIT_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    hits.append(now)
    return False


@leaf_disease_bp.post("/api/detect-leaf-disease")
def detect_leaf_disease_route():
    if _rate_limited():
        return _error(
            "rate_limited",
            "Too many leaf disease requests. Please wait a minute and try again.",
            429,
        )

    if request.content_length is not None and request.content_length > MAX_IMAGE_BYTES + (128 * 1024):
        return _error("file_too_large", "Leaf image must be 5 MB or smaller.", 413)

    file = request.files.get("file") or request.files.get("image")
    if file is None:
        return _error("missing_file", "Upload a leaf image using multipart field 'file'.", 400)

    image_bytes = file.read()
    image_hash = hashlib.sha256(image_bytes).hexdigest()[:16] if image_bytes else "empty"
    started = time.perf_counter()

    try:
        prepared = prepare_leaf_image(file.filename, image_bytes)
        result = inference.predict_leaf_disease(prepared)
    except LeafDiseaseUploadError as exc:
        return _error(exc.code, exc.message, exc.status_code)
    except inference.LeafDiseaseModelError as exc:
        return _error("model_unavailable", str(exc), 503)
    except Exception:
        LOGGER.exception("Unexpected leaf disease detection failure for image_hash=%s", image_hash)
        return _error("inference_failed", "Could not analyze this leaf image.", 500)

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    top_prediction = (result.get("predictions") or [{}])[0]
    LOGGER.info(
        "leaf_disease_prediction image_hash=%s top_class=%s confidence=%s latency_ms=%s",
        image_hash,
        top_prediction.get("class_name") or top_prediction.get("label"),
        top_prediction.get("confidence"),
        latency_ms,
    )
    return jsonify(result), 200

