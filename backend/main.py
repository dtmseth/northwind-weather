"""Northwind Weather — FastAPI application.

Single combined endpoint aggregates weather, METAR, AQI, and sun data.
"""

from __future__ import annotations

import os
import sys

# Ensure backend/ is on the path so local imports (api.*, utils.*) resolve
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import httpx

from api.openmeteo import router as weather_router
from api.aqi import router as aqi_router
from api.metar import router as metar_router, _fetch_metar
from utils.airports import nearest_airport
from utils.cache import cache
from utils.suncalc import get_sun_times, get_moon_data

app = FastAPI(title="Northwind Weather", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(weather_router)
app.include_router(aqi_router)
app.include_router(metar_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/forecast")
async def combined_forecast(lat: float, lon: float, days: int = 7):
    """Aggregated forecast: weather + METAR + AQI + sun/moon data."""
    cache_key = f"forecast:{lat:.4f},{lon:.4f},{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # 1. Fetch all data sources concurrently
    async with httpx.AsyncClient(timeout=20) as client:
        # Weather
        weather_params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": ",".join([
                "temperature_2m", "cloud_cover", "cloud_cover_low",
                "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m",
                "wind_direction_10m", "wind_gusts_10m", "wind_speed_80m",
                "wind_direction_80m", "visibility", "precipitation_probability",
                "weather_code", "shortwave_radiation", "direct_radiation",
                "sunshine_duration", "cape", "lifted_index",
            ]),
            "daily": "sunrise,sunset,sunshine_duration,precipitation_sum",
            "timezone": "auto",
            "forecast_days": days,
        }
        weather_resp = await client.get(
            "https://api.open-meteo.com/v1/forecast", params=weather_params
        )
        weather_data = weather_resp.json() if weather_resp.status_code == 200 else None

        # AQI
        aqi_params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "european_aqi,us_aqi,pm2_5,pm10,dust,aerosol_optical_depth",
            "timezone": "auto",
            "forecast_days": 3,
        }
        aqi_resp = await client.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality", params=aqi_params
        )
        aqi_data = aqi_resp.json() if aqi_resp.status_code == 200 else None

    # 2. Find nearest airport and METAR
    airport = nearest_airport(lat, lon)
    metar_data = None
    if airport and airport.distance_km <= 150:
        metar_data = await _fetch_metar(airport.icao)

    # 3. Build daily forecast array
    timezone = "auto"
    daily_data = []

    if weather_data and "daily" in weather_data:
        w_daily = weather_data["daily"]
        w_hourly = weather_data.get("hourly", {})
        dates = w_daily.get("time", [])
        hour_times = w_hourly.get("time", [])

        for di, date_str in enumerate(dates):
            # Sun/moon data
            sun = get_sun_times(lat, lon, date_str)
            moon = get_moon_data(lat, lon, date_str)

            # Grab hourly slices for this day
            day_hour_indices = [
                i for i, t in enumerate(hour_times) if t.startswith(date_str)
            ]

            hourly = []
            for idx in day_hour_indices:
                hour_entry = {"hour": hour_times[idx][11:16] if idx < len(hour_times) else ""}
                for var in WEATHER_HOURLY_KEYS:
                    vals = w_hourly.get(var, [])
                    hour_entry[var] = vals[idx] if idx < len(vals) else None
                hourly.append(hour_entry)

            # Cloud interest score (0-10)
            # Use METAR cloud type if available, else model cloud cover
            cloud_score = _compute_cloud_score(
                metar_data, hourly, sun, date_str
            )

            # Thunderstorm detection
            storm = _detect_storms(hourly, sun)

            # Red sun prediction
            red_sun = _predict_red_sun(hourly, aqi_data, sun, date_str)

            day_entry = {
                "date": date_str,
                "sun": {
                    **sun,
                    "moon": moon,
                },
                "cloud_score": cloud_score,
                "storm_photo": storm,
                "red_sun": red_sun,
                "hourly": hourly,
            }

            if metar_data:
                day_entry["metar"] = {
                    "airport": {
                        "icao": airport.icao,
                        "name": airport.name,
                        "distance_km": airport.distance_km,
                    },
                    "latest": metar_data,
                }

            if aqi_data and "hourly" in aqi_data:
                aq_hourly = aqi_data["hourly"]
                day_entry["aqi"] = {
                    "us_aqi_max": _max_in_day(aq_hourly.get("us_aqi", []), hour_times, date_str),
                    "aerosol_optical_depth_max": _max_in_day(
                        aq_hourly.get("aerosol_optical_depth", []), hour_times, date_str
                    ),
                }

            daily_data.append(day_entry)

    result = {
        "location": {"lat": lat, "lon": lon},
        "timezone": timezone,
        "nearest_airport": {
            "icao": airport.icao,
            "name": airport.name,
            "distance_km": airport.distance_km,
        }
        if airport
        else None,
        "daily": daily_data,
    }

    cache.set(cache_key, result, ttl=600)  # 10 min
    return result


# Hourly keys used in weather response
WEATHER_HOURLY_KEYS = [
    "temperature_2m", "cloud_cover", "cloud_cover_low", "cloud_cover_mid",
    "cloud_cover_high", "wind_speed_10m", "wind_direction_10m",
    "wind_gusts_10m", "wind_speed_80m", "wind_direction_80m",
    "visibility", "precipitation_probability", "weather_code",
    "shortwave_radiation", "direct_radiation", "sunshine_duration",
    "cape", "lifted_index",
]


def _compute_cloud_score(
    metar: dict | None, hourly: list[dict], sun: dict, date_str: str
) -> dict:
    """Score sky interest 0-10 based on clouds."""
    if metar and metar.get("clouds"):
        clouds = metar["clouds"]
        types = [c.get("type", "") for c in clouds if c.get("type")]
        covers = [c.get("cover", "") for c in clouds]

        has_cu = any(t in ("CU", "TCU") for t in types)
        has_cb = any(t == "CB" for t in types)
        has_ac = any(t == "AC" for t in types)
        has_ci = any(t in ("CI", "CS", "CC") for t in types)
        has_ovc = any(c in ("OVC", "VV") for c in covers)
        has_few = any(c in ("FEW", "SCT") for c in covers)

        score = 3  # baseline
        if has_cu and has_few:
            score = 9
        elif has_cu and not has_ovc:
            score = 8
        elif has_ac and has_ci:
            score = 8
        elif has_ci and has_few:
            score = 7
        elif has_cb:
            score = 5
        elif has_ovc and has_ac:
            score = 4
        elif has_ovc:
            score = 1

        return {"score": score, "source": "metar", "clouds": clouds}

    # Fallback: model cloud cover
    if not hourly:
        return {"score": 3, "source": "model"}

    # Average cloud cover around golden hour if possible
    mid_day_cover = [
        h.get("cloud_cover", 50) for h in hourly
        if h.get("cloud_cover") is not None
    ]
    if mid_day_cover:
        avg = sum(mid_day_cover) / len(mid_day_cover)
        if avg < 10:
            score = 3
        elif avg < 30:
            score = 6
        elif avg < 60:
            score = 7
        elif avg < 80:
            score = 4
        else:
            score = 2
        return {"score": score, "source": "model"}

    return {"score": 3, "source": "model"}


def _detect_storms(hourly: list[dict], sun: dict) -> dict:
    """Detect storm photo opportunities."""
    storm_codes = {95, 96, 99}
    for h in hourly:
        wc = h.get("weather_code")
        cc = h.get("cloud_cover", 50) or 50
        cape = h.get("cape", 0) or 0

        if wc in storm_codes:
            # Isolated (cloud cover < 65) or widespread
            is_isolated = cc < 65
            return {
                "score": 10 if is_isolated else 5,
                "type": "isolated_storm_clear_breaks" if is_isolated else "widespread_storm",
                "hour": h.get("hour"),
            }
        elif cape > 1500 and cc < 65:
            return {
                "score": 8,
                "type": "unstable_air_clear_breaks",
                "hour": h.get("hour"),
            }

    return {"score": 0, "type": "none", "hour": None}


def _predict_red_sun(
    hourly: list[dict], aqi_data: dict | None, sun: dict, date_str: str
) -> dict:
    """Predict if sunrise/sunset will have a deep red sun."""
    if not aqi_data or "hourly" not in aqi_data:
        return {"morning": False, "evening": False}

    aod_vals = aqi_data["hourly"].get("aerosol_optical_depth", [])
    aod_max = max(aod_vals) if aod_vals else 0

    if aod_max < 0.3:
        return {"morning": False, "evening": False}

    # Check cloud cover at sunrise/sunset hours
    sunrise_hour = (sun.get("sunrise") or "")[11:13]
    sunset_hour = (sun.get("sunset") or "")[11:13]

    morning_clear = True
    evening_clear = True

    for h in hourly:
        hr = h.get("hour", "")[:2]
        cc = h.get("cloud_cover", 100) or 100
        if hr == sunrise_hour and cc > 50:
            morning_clear = False
        if hr == sunset_hour and cc > 50:
            evening_clear = False

    return {
        "morning": morning_clear and aod_max > 0.3,
        "evening": evening_clear and aod_max > 0.3,
        "aerosol_optical_depth": round(aod_max, 2),
    }


def _max_in_day(vals: list, hour_times: list, date_str: str) -> float | None:
    """Max value for a given date from hourly time-series."""
    day_vals = [
        v for i, v in enumerate(vals)
        if i < len(hour_times) and hour_times[i].startswith(date_str) and v is not None
    ]
    return max(day_vals) if day_vals else None

# Serve frontend static files — must come LAST so API routes take priority
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
