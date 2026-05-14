from __future__ import annotations

import json
from typing import Any, Dict

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt

from config import settings
from database.db import (
    get_prediction_count,
    get_recent_predictions,
    get_recent_predictions_for_user,
    get_user_count,
)
from utils.auth import role_required


system_bp = Blueprint("system_bp", __name__)


def _ml_dir():
    return settings.ml_dir


def _read_latest_json(pattern: str) -> Dict[str, Any]:
    candidates = list(_ml_dir().glob(pattern))
    if not candidates:
        raise FileNotFoundError(f"No metrics file found for pattern: {pattern}")

    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    with latest.open("r", encoding="utf-8") as fp:
        return json.load(fp)


@system_bp.get("/api/model-info")
@role_required("admin")
def model_info():
    """Return classifier and regressor metrics from ML artifacts."""
    try:
        classifier_metrics = _read_latest_json("**/rf_classifier_*_metrics.json")
        regressor_metrics = _read_latest_json("**/rf_regressor_*_metrics.json")
        return (
            jsonify(
                {
                    "classifier_metrics": classifier_metrics,
                    "regressor_metrics": regressor_metrics,
                }
            ),
            200,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except (json.JSONDecodeError, OSError) as exc:
        return jsonify({"error": f"Failed to read model metrics: {exc}"}), 500


@system_bp.get("/api/predictions")
@role_required("farmer", "admin")
def list_predictions():
    """Return latest prediction records from SQLite based on role."""
    try:
        claims = get_jwt()
        role = claims.get("role")
        user_id = int(claims.get("user_id"))

        if role == "admin":
            records = get_recent_predictions(limit=20)
        else:
            records = get_recent_predictions_for_user(user_id=user_id, limit=20)

        return jsonify({"predictions": records}), 200
    except Exception:
        return jsonify({"error": "Failed to fetch predictions."}), 500


@system_bp.get("/api/admin/stats")
@role_required("admin")
def admin_stats():
    try:
        return jsonify({"total_predictions": get_prediction_count(), "user_count": get_user_count()}), 200
    except Exception:
        return jsonify({"error": "Failed to fetch admin stats."}), 500
