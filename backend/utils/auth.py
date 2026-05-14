from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def role_required(*roles: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    role_set = {role.strip().lower() for role in roles}

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        @jwt_required()
        def wrapper(*args: Any, **kwargs: Any):
            claims = get_jwt()
            role = str(claims.get("role", "")).lower()
            if role not in role_set:
                return jsonify({"error": "Forbidden: insufficient role permissions."}), 403
            return func(*args, **kwargs)

        return wrapper

    return decorator
