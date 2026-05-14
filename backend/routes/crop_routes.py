from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt

from services.prediction_service import predict_crop
from utils.auth import role_required


crop_bp = Blueprint("crop_bp", __name__)


@crop_bp.route("/api/predict/crop", methods=["POST"])
@role_required("farmer", "admin")
def predict_crop_route():
    """Predict crop label from soil/weather inputs."""
    try:
        payload = request.get_json(silent=True)
        if payload is None:
            return jsonify({"error": "Invalid or missing JSON body."}), 400

        claims = get_jwt()
        user_id = claims.get("user_id")

        result = predict_crop(payload, user_id=user_id)
        if "error" in result:
            return jsonify(result), 400

        return jsonify({"result": result}), 200
    except Exception:
        return jsonify({"error": "Internal server error."}), 500
