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
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    groq_timeout_seconds: int = int(os.getenv("GROQ_TIMEOUT_SECONDS", "25"))
    data_gov_api_key: str = os.getenv("DATA_GOV_API_KEY", os.getenv("MANDI_API_KEY", ""))
    mandi_api_url: str = os.getenv(
        "MANDI_API_URL",
        "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
    )
    mandi_api_timeout_seconds: int = int(os.getenv("MANDI_API_TIMEOUT_SECONDS", "12"))
    mandi_cache_ttl_seconds: int = int(os.getenv("MANDI_CACHE_TTL_SECONDS", "1800"))


settings = Settings()
