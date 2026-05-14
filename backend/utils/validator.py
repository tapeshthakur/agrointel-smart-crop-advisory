from __future__ import annotations

from typing import Any, Dict, List


REQUIRED_FIELDS = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
]


def validate_required_fields(payload: Dict[str, Any]) -> None:
    """
    Validate payload contains all required crop input fields.
    Raises ValueError when any required field is missing.
    """
    if not isinstance(payload, dict):
        raise TypeError("Payload must be a dictionary.")

    missing: List[str] = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
