from __future__ import annotations

from typing import Any, Dict, List

from services.advisory_service import detect_season


MSP_DATA = {
    "wheat": {"msp": "?2,275 / quintal", "trend": "Stable procurement demand in Rabi markets."},
    "rice": {"msp": "?2,300 / quintal", "trend": "Strong procurement in Kharif-heavy states."},
    "maize": {"msp": "?2,090 / quintal", "trend": "Demand can vary by poultry feed and starch market."},
    "chickpea": {"msp": "?5,440 / quintal", "trend": "Pulse demand remains relatively strong."},
}


GOVT_SCHEMES = {
    "Maharashtra": [
        {"name": "Magel Tyala Shet Tale", "benefit": "Farm pond and irrigation support", "link": "https://mahadbt.maharashtra.gov.in"},
        {"name": "PM-KISAN", "benefit": "?6000 yearly income support", "link": "https://pmkisan.gov.in"},
    ],
    "Punjab": [
        {"name": "PM-KISAN", "benefit": "?6000 yearly income support", "link": "https://pmkisan.gov.in"},
        {"name": "PANI Bachao Paisa Kamao", "benefit": "Incentive for groundwater saving", "link": "https://agripb.gov.in"},
    ],
    "Uttar Pradesh": [
        {"name": "PM-KISAN", "benefit": "?6000 yearly income support", "link": "https://pmkisan.gov.in"},
        {"name": "Krishak Durghatna Kalyan Yojana", "benefit": "Farmer family accident support", "link": "https://upagripardarshi.gov.in"},
    ],
    "Karnataka": [
        {"name": "Raitha Siri", "benefit": "Support for millet and sustainable cultivation", "link": "https://raitamitra.karnataka.gov.in"},
        {"name": "PM-KISAN", "benefit": "?6000 yearly income support", "link": "https://pmkisan.gov.in"},
    ],
}


KVK_CONTACTS = {
    "Maharashtra": {"name": "KVK Baramati / district KVK network", "contact": "+91-2112-255227"},
    "Punjab": {"name": "KVK Ludhiana / district KVK network", "contact": "+91-161-2401960"},
    "Uttar Pradesh": {"name": "KVK Kanpur / district KVK network", "contact": "+91-512-2693191"},
    "Karnataka": {"name": "KVK Bengaluru Rural / district KVK network", "contact": "+91-80-28466317"},
}


SEASONAL_MARKET_TIPS = {
    "Kharif": "Monitor rainfall timing and paddy/maize mandi arrivals before locking the crop choice.",
    "Rabi": "Compare procurement support, irrigation availability, and storage options for wheat and pulses.",
    "Zaid": "Short-duration summer crops can work well, but market timing and irrigation reliability matter most.",
}


def get_market_overview(state: str | None, crop: str | None, season: str | None) -> Dict[str, Any]:
    active_state = (state or "Maharashtra").strip().title()
    active_crop = str(crop or "wheat").strip().lower()
    active_season = detect_season(season)

    schemes: List[Dict[str, Any]] = GOVT_SCHEMES.get(active_state, GOVT_SCHEMES["Maharashtra"])
    kvk = KVK_CONTACTS.get(active_state, KVK_CONTACTS["Maharashtra"])
    msp = MSP_DATA.get(active_crop, {"msp": "Not listed", "trend": "Check nearest mandi or MSP circular for the latest figure."})

    return {
        "state": active_state,
        "season": active_season,
        "crop": active_crop,
        "msp": msp,
        "schemes": schemes,
        "kvk": kvk,
        "market_tip": SEASONAL_MARKET_TIPS.get(active_season, SEASONAL_MARKET_TIPS["Kharif"]),
    }
