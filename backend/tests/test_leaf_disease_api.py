from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import pytest
from PIL import Image

os.environ["FLASK_SKIP_STARTUP_MODEL_WARMUP"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("leaf_disease.inference.warmup_leaf_disease_model", lambda: True)
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()


def _png_bytes() -> bytes:
    image = Image.new("RGB", (224, 224), color=(30, 150, 60))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_valid_image_returns_predictions(client, monkeypatch):
    monkeypatch.setattr(
        "leaf_disease.inference.predict_leaf_disease",
        lambda prepared: {
            "predictions": [
                {
                    "class_name": "Tomato_healthy",
                    "label": "Tomato healthy",
                    "confidence": 0.91,
                    "is_healthy": True,
                }
            ],
            "is_healthy": True,
        },
    )

    response = client.post(
        "/api/detect-leaf-disease",
        data={"file": (io.BytesIO(_png_bytes()), "leaf.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert response.get_json()["is_healthy"] is True
    assert response.get_json()["predictions"][0]["class_name"] == "Tomato_healthy"


def test_missing_file_returns_error(client):
    response = client.post("/api/detect-leaf-disease", data={}, content_type="multipart/form-data")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "missing_file"


def test_non_image_returns_corrupt_error(client):
    response = client.post(
        "/api/detect-leaf-disease",
        data={"file": (io.BytesIO(b"not an image"), "leaf.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "corrupt_image"


def test_oversized_file_returns_error(client):
    response = client.post(
        "/api/detect-leaf-disease",
        data={"file": (io.BytesIO(b"x" * ((5 * 1024 * 1024) + 1)), "leaf.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"


def test_low_confidence_case(client, monkeypatch):
    monkeypatch.setattr(
        "leaf_disease.inference.predict_leaf_disease",
        lambda prepared: {
            "predictions": [
                {
                    "class_name": "uncertain",
                    "label": "couldn't confidently identify",
                    "confidence": 0.22,
                    "is_healthy": False,
                }
            ],
            "is_healthy": False,
        },
    )

    response = client.post(
        "/api/detect-leaf-disease",
        data={"file": (io.BytesIO(_png_bytes()), "leaf.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["is_healthy"] is False
    assert body["predictions"][0]["label"] == "couldn't confidently identify"
