"""Open-Meteo Air Quality API proxy — aerosol optical depth for sun redness."""

from __future__ import annotations

from fastapi import APIRouter
import httpx

from utils.cache import cache

router = APIRouter(prefix="/api", tags=["aqi"])

AQI_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality"

AQI_VARS = [
    "european_aqi",
    "us_aqi",
    "pm2_5",
    "pm10",
    "dust",
    "aerosol_optical_depth",
]


@router.get("/aqi")
async def get_aqi(lat: float, lon: float):
    """Proxy Open-Meteo air quality data for sun redness prediction."""
    cache_key = f"aqi:{lat:.4f},{lon:.4f}"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(AQI_VARS),
        "timezone": "auto",
        "forecast_days": 3,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(AQI_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    cache.set(cache_key, data, ttl=3600)  # 1 hour
    return data
