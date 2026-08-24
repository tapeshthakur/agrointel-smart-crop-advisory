from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from config import settings
from services.advisory_service import detect_season


MSP_DATA = {
    "wheat": {"msp": "Rs. 2,275 / quintal", "trend": "Stable procurement demand in Rabi markets."},
    "rice": {"msp": "Rs. 2,300 / quintal", "trend": "Strong procurement in Kharif-heavy states."},
    "maize": {"msp": "Rs. 2,090 / quintal", "trend": "Demand can vary by poultry feed and starch market."},
    "chickpea": {"msp": "Rs. 5,440 / quintal", "trend": "Pulse demand remains relatively strong."},
}


GOVT_SCHEMES = {
    "Maharashtra": [
        {"name": "Magel Tyala Shet Tale", "benefit": "Farm pond and irrigation support", "link": "https://mahadbt.maharashtra.gov.in"},
        {"name": "PM-KISAN", "benefit": "Rs. 6000 yearly income support", "link": "https://pmkisan.gov.in"},
    ],
    "Punjab": [
        {"name": "PM-KISAN", "benefit": "Rs. 6000 yearly income support", "link": "https://pmkisan.gov.in"},
        {"name": "PANI Bachao Paisa Kamao", "benefit": "Incentive for groundwater saving", "link": "https://agripb.gov.in"},
    ],
    "Uttar Pradesh": [
        {"name": "PM-KISAN", "benefit": "Rs. 6000 yearly income support", "link": "https://pmkisan.gov.in"},
        {"name": "Krishak Durghatna Kalyan Yojana", "benefit": "Farmer family accident support", "link": "https://upagripardarshi.gov.in"},
    ],
    "Karnataka": [
        {"name": "Raitha Siri", "benefit": "Support for millet and sustainable cultivation", "link": "https://raitamitra.karnataka.gov.in"},
        {"name": "PM-KISAN", "benefit": "Rs. 6000 yearly income support", "link": "https://pmkisan.gov.in"},
    ],
    "Gujarat": [
        {"name": "Ikhedut Portal", "benefit": "State agriculture scheme applications and subsidy support", "link": "https://ikhedut.gujarat.gov.in"},
        {"name": "PM-KISAN", "benefit": "Rs. 6000 yearly income support", "link": "https://pmkisan.gov.in"},
    ],
}


KVK_CONTACTS = {
    "Maharashtra": {"name": "KVK Baramati / district KVK network", "contact": "+91-2112-255227"},
    "Punjab": {"name": "KVK Ludhiana / district KVK network", "contact": "+91-161-2401960"},
    "Uttar Pradesh": {"name": "KVK Kanpur / district KVK network", "contact": "+91-512-2693191"},
    "Karnataka": {"name": "KVK Bengaluru Rural / district KVK network", "contact": "+91-80-28466317"},
    "Gujarat": {"name": "KVK Anand / district KVK network", "contact": "+91-2692-261310"},
}


SEASONAL_MARKET_TIPS = {
    "Kharif": "Monitor rainfall timing and paddy/maize mandi arrivals before locking the crop choice.",
    "Rabi": "Compare procurement support, irrigation availability, and storage options for wheat and pulses.",
    "Zaid": "Short-duration summer crops can work well, but market timing and irrigation reliability matter most.",
}


COMMODITY_ALIASES = {
    "wheat": ["Wheat"],
    "rice": ["Rice", "Paddy(Dhan)(Common)", "Paddy"],
    "paddy": ["Paddy(Dhan)(Common)", "Paddy", "Rice"],
    "maize": ["Maize"],
    "corn": ["Maize"],
    "chickpea": ["Bengal Gram(Gram)(Whole)", "Gram", "Chickpea"],
    "coffee": ["Coffee"],
}


_MANDI_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _cache_get(key: Tuple[str, str]) -> Dict[str, Any] | None:
    cached = _MANDI_CACHE.get(key)
    if not cached:
        return None
    age_seconds = time.time() - float(cached.get("_cached_at", 0))
    if age_seconds > settings.mandi_cache_ttl_seconds:
        return None
    return cached.get("payload")


def _cache_set(key: Tuple[str, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    _MANDI_CACHE[key] = {"_cached_at": time.time(), "payload": payload}
    return payload


def _record_value(record: Dict[str, Any], key: str) -> Any:
    if key in record:
        return record.get(key)
    normalized_key = key.lower()
    for raw_key, value in record.items():
        if str(raw_key).lower() == normalized_key:
            return value
    return None


def _float_or_none(value: Any) -> float | None:
    try:
        if value in {None, ""}:
            return None
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _commodity_aliases(crop: str) -> List[str]:
    crop_key = str(crop or "wheat").strip().lower()
    return COMMODITY_ALIASES.get(crop_key, [crop_key.title()])


def _request_mandi_records(state: str, commodity: str) -> Dict[str, Any]:
    query = urllib.parse.urlencode(
        {
            "api-key": settings.data_gov_api_key,
            "format": "json",
            "limit": "20",
            "filters[state]": state,
            "filters[commodity]": commodity,
        }
    )
    url = f"{settings.mandi_api_url}?{query}"
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Accept": "application/json",
            "User-Agent": "smart-crop-advisory-system/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=settings.mandi_api_timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def _normalise_mandi_record(record: Dict[str, Any]) -> Dict[str, Any]:
    min_price = _float_or_none(_record_value(record, "min_price"))
    max_price = _float_or_none(_record_value(record, "max_price"))
    modal_price = _float_or_none(_record_value(record, "modal_price"))
    return {
        "state": _record_value(record, "state") or "",
        "district": _record_value(record, "district") or "",
        "market": _record_value(record, "market") or "",
        "commodity": _record_value(record, "commodity") or "",
        "variety": _record_value(record, "variety") or "",
        "grade": _record_value(record, "grade") or "",
        "arrival_date": _record_value(record, "arrival_date") or "",
        "min_price": min_price,
        "max_price": max_price,
        "modal_price": modal_price,
        "unit": "Rs/quintal",
    }


def _summarise_live_prices(records: List[Dict[str, Any]], commodity: str) -> Dict[str, Any]:
    modal_prices = [record["modal_price"] for record in records if record.get("modal_price") is not None]
    min_prices = [record["min_price"] for record in records if record.get("min_price") is not None]
    max_prices = [record["max_price"] for record in records if record.get("max_price") is not None]
    latest_date = max((str(record.get("arrival_date") or "") for record in records), default="")

    summary: Dict[str, Any] = {
        "commodity": commodity,
        "record_count": len(records),
        "latest_arrival_date": latest_date,
        "average_modal_price": round(sum(modal_prices) / len(modal_prices), 2) if modal_prices else None,
        "lowest_min_price": min(min_prices) if min_prices else None,
        "highest_max_price": max(max_prices) if max_prices else None,
        "unit": "Rs/quintal",
    }
    if summary["average_modal_price"] is not None:
        summary["display_price"] = f"Rs. {summary['average_modal_price']:,.0f} / quintal"
    else:
        summary["display_price"] = "Live price unavailable"
    return summary


def fetch_live_mandi_prices(state: str, crop: str) -> Dict[str, Any]:
    cache_key = (state.strip().title(), str(crop or "wheat").strip().lower())
    cached = _cache_get(cache_key)
    if cached:
        return {**cached, "from_cache": True}

    if not settings.data_gov_api_key:
        return {
            "is_live": False,
            "from_cache": False,
            "source": "data.gov.in Agmarknet mandi API",
            "fetched_at": _now_iso(),
            "message": "DATA_GOV_API_KEY is not configured, so static fallback data is shown.",
            "records": [],
        }

    errors: List[str] = []
    for commodity in _commodity_aliases(crop):
        try:
            payload = _request_mandi_records(state=state, commodity=commodity)
            raw_records = payload.get("records") or []
            records = [_normalise_mandi_record(record) for record in raw_records]
            if not records:
                continue
            live_payload = {
                "is_live": True,
                "from_cache": False,
                "source": "data.gov.in Agmarknet mandi API",
                "source_url": "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
                "fetched_at": _now_iso(),
                "summary": _summarise_live_prices(records, commodity),
                "records": records,
            }
            return _cache_set(cache_key, live_payload)
        except urllib.error.HTTPError as exc:
            errors.append(f"{commodity}: HTTP {exc.code}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            errors.append(f"{commodity}: {exc}")

    return {
        "is_live": False,
        "from_cache": False,
        "source": "data.gov.in Agmarknet mandi API",
        "source_url": "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
        "fetched_at": _now_iso(),
        "message": "No live mandi records were available for the selected crop/state; static fallback data is shown.",
        "errors": errors[:3],
        "records": [],
    }


def get_market_overview(state: str | None, crop: str | None, season: str | None) -> Dict[str, Any]:
    active_state = (state or "Maharashtra").strip().title()
    active_crop = str(crop or "wheat").strip().lower()
    active_season = detect_season(season)

    schemes: List[Dict[str, Any]] = GOVT_SCHEMES.get(active_state, GOVT_SCHEMES["Maharashtra"])
    kvk = KVK_CONTACTS.get(active_state, KVK_CONTACTS["Maharashtra"])
    msp = MSP_DATA.get(active_crop, {"msp": "Not listed", "trend": "Check nearest mandi or MSP circular for the latest figure."})
    mandi = fetch_live_mandi_prices(active_state, active_crop)

    if mandi.get("is_live") and mandi.get("summary", {}).get("display_price"):
        msp = {
            **msp,
            "live_modal_price": mandi["summary"]["display_price"],
            "trend": (
                f"Live mandi modal price average for {mandi['summary']['commodity']} "
                f"from {active_state} markets. Check record date before selling."
            ),
        }

    return {
        "state": active_state,
        "season": active_season,
        "crop": active_crop,
        "msp": msp,
        "mandi": mandi,
        "schemes": schemes,
        "kvk": kvk,
        "market_tip": SEASONAL_MARKET_TIPS.get(active_season, SEASONAL_MARKET_TIPS["Kharif"]),
    }
