"""AviationWeather.gov METAR proxy — cloud layers, wind, visibility."""

from __future__ import annotations

from fastapi import APIRouter
import httpx

from utils.cache import cache
from utils.airports import nearest_airport

router = APIRouter(prefix="/api", tags=["metar"])

METAR_BASE = "https://aviationweather.gov/api/data/metar"


@router.get("/metar/nearest")
async def get_nearest_metar(lat: float, lon: float):
    """Find nearest airport and return its latest METAR."""
    airport = nearest_airport(lat, lon)

    if airport is None:
        return {
            "error": "No airport found within 150km",
            "airport": None,
            "metar": None,
        }

    metar_data = await _fetch_metar(airport.icao)

    return {
        "airport": {
            "icao": airport.icao,
            "name": airport.name,
            "lat": airport.lat,
            "lon": airport.lon,
            "distance_km": airport.distance_km,
        },
        "metar": metar_data,
    }


@router.get("/metar")
async def get_metar(ids: str):
    """Get METAR for a specific station ID (e.g. KLAX)."""
    data = await _fetch_metar(ids.upper())
    return data


async def _fetch_metar(ids: str) -> dict | None:
    """Fetch and parse METAR from AviationWeather.gov."""
    cache_key = f"metar:{ids}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params = {"ids": ids, "format": "json"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(METAR_BASE, params=params)
        if resp.status_code != 200:
            return None
        raw = resp.json()

    if not raw or not isinstance(raw, list) or len(raw) == 0:
        cache.set(cache_key, None, ttl=600)
        return None

    raw_metar = raw[0]

    # Parse into clean structure
    parsed = {
        "station": raw_metar.get("icaoId") or raw_metar.get("metar_id", ids),
        "time": raw_metar.get("obsTime"),
        "raw": raw_metar.get("rawOb", ""),
        "flight_category": raw_metar.get("flightCategory"),
        "wind": {
            "direction": raw_metar.get("wdir"),
            "speed_kt": raw_metar.get("wspd"),
            "gust_kt": raw_metar.get("wgst"),
        },
        "visibility": {
            "miles": raw_metar.get("visib"),
        },
        "temp_c": raw_metar.get("temp"),
        "dewpoint_c": raw_metar.get("dewp"),
        "clouds": [],
    }

    # Parse cloud layers
    raw_clouds = raw_metar.get("cloud", [])
    for cl in raw_clouds if raw_clouds else []:
        parsed["clouds"].append({
            "cover": cl.get("cover"),
            "base_ft_agl": cl.get("base"),
            "type": cl.get("type"),
        })

    cache.set(cache_key, parsed, ttl=600)  # 10 min
    return parsed
