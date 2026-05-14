from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Load environment variables from backend/.env when present.
load_dotenv(BASE_DIR / ".env")


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = _bool_env("FLASK_DEBUG", True)
    host: str = os.getenv("FLASK_HOST", "0.0.0.0")
    port: int = int(os.getenv("FLASK_PORT", "5000"))
    cors_origins: str = os.getenv("CORS_ORIGINS", "*")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    db_path: Path = Path(os.getenv("DB_PATH", str(BASE_DIR / "database" / "predictions.db")))
    ml_dir: Path = Path(os.getenv("ML_DIR", str(PROJECT_ROOT / "ml")))
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")


settings = Settings()
