from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.market_service import get_market_overview
from utils.auth import role_required


market_bp = Blueprint("market_bp", __name__)


@market_bp.get("/api/market/overview")
@role_required("farmer", "admin")
def market_overview():
    state = request.args.get("state")
    crop = request.args.get("crop")
    season = request.args.get("season")

    try:
        return jsonify(get_market_overview(state=state, crop=crop, season=season)), 200
    except Exception:
        return jsonify({"error": "Failed to load market and government scheme information."}), 500
