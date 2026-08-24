from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.groq_service import GroqServiceError, ask_groq_farmer_assistant
from utils.auth import role_required


ai_bp = Blueprint("ai_bp", __name__)


@ai_bp.route("/api/ai/chat", methods=["POST"])
@role_required("farmer", "admin")
def ai_chat_route():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid or missing JSON body."}), 400

    message = str(payload.get("message", "")).strip()
    if not message:
        return jsonify({"error": "Question is required."}), 400
    if len(message) > 1200:
        return jsonify({"error": "Question is too long. Please keep it under 1200 characters."}), 400

    try:
        answer = ask_groq_farmer_assistant(
            message,
            language=payload.get("language", "en"),
            context=payload.get("context") or {},
            history=payload.get("history") or [],
        )
        return jsonify({"answer": answer}), 200
    except GroqServiceError as exc:
        return jsonify({"error": str(exc)}), 502
