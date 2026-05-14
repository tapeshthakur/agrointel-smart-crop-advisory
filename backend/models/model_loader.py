from __future__ import annotations

import glob
import re
from pathlib import Path
from typing import Any, List, Tuple

import joblib
from config import settings


VERSION_PATTERN = re.compile(r"_v(\d{8}_\d{6})\.pkl$")


def _ml_dir() -> Path:
    """
    Resolve ../ml from backend directory:
    project/
      backend/models/model_loader.py
      ml/
    """
    return settings.ml_dir


def _candidate_paths(pattern: str) -> List[Path]:
    ml_root = _ml_dir()
    search_pattern = str(ml_root / "**" / pattern)
    return [Path(p) for p in glob.glob(search_pattern, recursive=True)]


def _version_key(path: Path) -> Tuple[int, str]:
    match = VERSION_PATTERN.search(path.name)
    if match:
        return (1, match.group(1))
    return (0, path.name)


def _load_latest(pattern: str, model_label: str) -> Any:
    candidates = _candidate_paths(pattern)
    if not candidates:
        raise FileNotFoundError(
            f"No {model_label} model found in '{_ml_dir()}' with pattern '{pattern}'."
        )

    latest = sorted(candidates, key=_version_key, reverse=True)[0]
    return joblib.load(latest)


def load_latest_classifier() -> Any:
    """Load latest versioned classifier model."""
    return _load_latest("rf_classifier_*_v*.pkl", "classifier")


def load_latest_regressor() -> Any:
    """Load latest versioned regressor model."""
    return _load_latest("rf_regressor_*_v*.pkl", "regressor")
