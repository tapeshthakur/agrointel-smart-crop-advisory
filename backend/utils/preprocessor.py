from __future__ import annotations

from typing import Any, Dict, Tuple


FEATURE_ORDER = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

FEATURE_RANGES: Dict[str, Tuple[float, float]] = {
    "N": (0.0, 200.0),
    "P": (0.0, 200.0),
    "K": (0.0, 200.0),
    "temperature": (-10.0, 60.0),
    "humidity": (0.0, 100.0),
    "ph": (0.0, 14.0),
    "rainfall": (0.0, 500.0),
}


class PreprocessingError(ValueError):
    """Raised when input preprocessing fails."""

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field

    def to_dict(self) -> Dict[str, Any]:
        error: Dict[str, Any] = {"message": str(self)}
        if self.field is not None:
            error["field"] = self.field
        return error


def validate_and_cast_types(data_dict: Dict[str, Any]) -> Dict[str, float]:
    """Validate required fields and cast each value to float."""
    if not isinstance(data_dict, dict):
        raise PreprocessingError("Input payload must be a JSON object.")

    missing = [field for field in FEATURE_ORDER if field not in data_dict]
    if missing:
        raise PreprocessingError(f"Missing required fields: {', '.join(missing)}")

    cleaned: Dict[str, float] = {}
    for field in FEATURE_ORDER:
        value = data_dict[field]
        try:
            cleaned[field] = float(value)
        except (TypeError, ValueError):
            raise PreprocessingError(
                f"Field '{field}' must be numeric and convertible to float.",
                field=field,
            ) from None

    return cleaned


def validate_ranges(data_dict: Dict[str, float]) -> Dict[str, float]:
    """Validate agronomic sanity bounds for each feature."""
    for field, (min_value, max_value) in FEATURE_RANGES.items():
        value = data_dict[field]
        if value < min_value or value > max_value:
            raise PreprocessingError(
                f"Field '{field}' out of range: {value}. "
                f"Expected {min_value} to {max_value}.",
                field=field,
            )
    return data_dict


def enforce_feature_order(data_dict: Dict[str, float]) -> Dict[str, float]:
    """Return a dictionary with the exact required feature order."""
    return {field: data_dict[field] for field in FEATURE_ORDER}

