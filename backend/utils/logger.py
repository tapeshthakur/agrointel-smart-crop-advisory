from __future__ import annotations

import logging

from config import settings


def setup_logging() -> None:
    """Configure root logger once for the backend service."""
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
