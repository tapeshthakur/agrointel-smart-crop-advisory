from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
import bcrypt
import sqlite3

from database.db import create_user, get_user_by_email, get_user_by_id


auth_bp = Blueprint("auth_bp", __name__)


@auth_bp.post("/api/auth/signup")
def signup():
    payload = request.get_json(silent=True) or {}

    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "farmer")).strip().lower()

    if not name:
        return jsonify({"error": "Name is required."}), 400
    if not email:
        return jsonify({"error": "Email is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if role not in {"admin", "farmer"}:
        return jsonify({"error": "Role must be either admin or farmer."}), 400

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "Email is already registered."}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        user = create_user(name=name, email=email, password_hash=password_hash, role=role)
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email is already registered."}), 409

    return (
        jsonify(
            {
                "message": "User registered successfully.",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "created_at": user["created_at"],
                },
            }
        ),
        201,
    )


@auth_bp.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    valid_password = bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8"))
    if not valid_password:
        return jsonify({"error": "Invalid email or password."}), 401

    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"user_id": user["id"], "role": user["role"]},
    )

    return jsonify(
        {
            "access_token": access_token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "created_at": user["created_at"],
            },
        }
    )


@auth_bp.get("/api/auth/me")
@jwt_required()
def me():
    identity = get_jwt_identity()
    claims = get_jwt()

    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        user_id = int(claims.get("user_id", 0))

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify({"user": user})
