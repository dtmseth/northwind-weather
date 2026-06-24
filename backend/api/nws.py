"""NWS Weather Alerts + RainViewer Radar API proxy with TTL cache."""

from __future__ import annotations

from fastapi import APIRouter
import httpx

from utils.cache import cache

router = APIRouter(prefix="/api", tags=["nws"])

NWS_BASE = "https://api.weather.gov/alerts/active"
RAINVIEWER_BASE = "https://api.rainviewer.com/public/weather-maps.json"
USER_AGENT = "Northwind Weather/1.0 (seth@northwindvisuals.com)"


@router.get("/nws/alerts")
async def get_alerts(lat: float, lon: float):
    """Fetch active NWS weather alerts for a lat/lon location. US only."""
    cache_key = f"nws_alerts:{lat:.4f},{lon:.4f}"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Quick bounding-box check for US territory
    if not (24.0 <= lat <= 72.0 and -180.0 <= lon <= -60.0):
        return []

    url = f"{NWS_BASE}?point={lat},{lon}"
    headers = {"User-Agent": USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return []
            data = resp.json()
    except Exception:
        return []

    features = data.get("features", [])
    alerts = []
    for feat in features:
        props = feat.get("properties", {})
        alerts.append({
            "event": props.get("event"),
            "headline": props.get("headline"),
            "description": props.get("description"),
            "severity": props.get("severity"),
            "urgency": props.get("urgency"),
            "onset": props.get("onset"),
            "expires": props.get("expires"),
            "area_desc": props.get("areaDesc"),
        })

    cache.set(cache_key, alerts, ttl=120)  # 2 min
    return alerts


@router.get("/nws/radar")
async def get_radar():
    """Fetch RainViewer radar tile index with past and nowcast frames."""
    cache_key = "nws_radar"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(RAINVIEWER_BASE)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return {"host": "", "past": [], "nowcast": []}

    # RainViewer response has radar.past / radar.nowcast nested under "radar", plus a "host" field
    result = {
        "host": data.get("host", ""),
        "past": data.get("radar", {}).get("past", []),
        "nowcast": data.get("radar", {}).get("nowcast", []),
    }

    cache.set(cache_key, result, ttl=300)  # 5 min
    return result
