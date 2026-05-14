from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.advisory_service import build_full_advisory
from utils.auth import role_required


advisory_bp = Blueprint("advisory_bp", __name__)


@advisory_bp.route("/api/advisory", methods=["POST"])
@role_required("farmer", "admin")
def advisory_route():
    """Build farmer-friendly advisory from prediction outputs and inputs."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid or missing JSON body."}), 400

    required = ["crop", "confidence", "irrigation", "inputs"]
    missing = [field for field in required if field not in payload]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        advisory = build_full_advisory(
            crop=payload["crop"],
            confidence=float(payload["confidence"]),
            irrigation_value=float(payload["irrigation"]),
            inputs=payload["inputs"],
            season=payload.get("season"),
            state=payload.get("state"),
            top_crops=payload.get("top_crops"),
        )
        return jsonify({"advisory": advisory}), 200
    except (TypeError, ValueError) as exc:
        return jsonify({"error": f"Invalid advisory payload: {exc}"}), 400
