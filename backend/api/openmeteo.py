"""Open-Meteo Weather Forecast API proxy with TTL cache."""

from __future__ import annotations

from fastapi import APIRouter
import httpx

from utils.cache import cache

router = APIRouter(prefix="/api", tags=["weather"])

OPENMETEO_BASE = "https://api.open-meteo.com/v1/forecast"

WEATHER_VARS = [
    "temperature_2m",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "wind_speed_80m",
    "wind_direction_80m",
    "visibility",
    "precipitation_probability",
    "weather_code",
    "shortwave_radiation",
    "direct_radiation",
    "sunshine_duration",
    "cape",
    "lifted_index",
]


@router.get("/weather")
async def get_weather(lat: float, lon: float, days: int = 7):
    """Proxy Open-Meteo weather forecast for photography-relevant variables."""
    cache_key = f"weather:{lat:.4f},{lon:.4f},{days}"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(WEATHER_VARS),
        "daily": "sunrise,sunset,sunshine_duration,precipitation_sum",
        "timezone": "auto",
        "forecast_days": days,
        "wind_speed_unit": "ms",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(OPENMETEO_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    cache.set(cache_key, data, ttl=1800)  # 30 min
    return data
