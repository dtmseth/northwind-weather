"""Server-side sun calculations — pure Python, no numpy dependency.

Uses the suncalc.js algorithm ported to Python.
"""

from __future__ import annotations

import datetime
import math

# Constants
J1970 = 2440588
J2000 = 2451545
RAD = math.pi / 180
DAY_MS = 1000 * 60 * 60 * 24
_SEC_PER_DAY = 86400


def _to_days(date: datetime.date | datetime.datetime) -> float:
    if isinstance(date, datetime.datetime):
        ts = date.timestamp()
    else:
        dt = datetime.datetime(date.year, date.month, date.day, tzinfo=datetime.timezone.utc)
        ts = dt.timestamp()
    return ts / _SEC_PER_DAY - 0.5 + J1970 - J2000


def _solar_mean_anomaly(d: float) -> float:
    return 357.5291 + 0.98560028 * d


def _equation_of_center(m: float) -> float:
    m_rad = m * RAD
    return 1.9148 * math.sin(m_rad) + 0.02 * math.sin(2 * m_rad) + 0.0003 * math.sin(3 * m_rad)


def _ecliptic_longitude(m: float) -> float:
    c = _equation_of_center(m)
    return m + 102.9372 + c + 180


def _declination(lon: float) -> float:
    return math.asin(math.sin(lon * RAD) * math.sin(23.44 * RAD)) / RAD


def _right_ascension(lon: float) -> float:
    return math.atan2(math.sin(lon * RAD) * math.cos(23.44 * RAD), math.cos(lon * RAD)) / RAD


def _hour_angle(lat: float, dec: float, elevation: float) -> float:
    lat_r = lat * RAD
    dec_r = dec * RAD
    elev_r = elevation * RAD
    return math.acos(
        (math.sin(elev_r) - math.sin(lat_r) * math.sin(dec_r))
        / (math.cos(lat_r) * math.cos(dec_r))
    ) / RAD


def _sun_position(d: float, lat: float, lng: float) -> dict:
    m = _solar_mean_anomaly(d)
    lon = _ecliptic_longitude(m)
    dec = _declination(lon)
    ra = _right_ascension(lon)
    # Greenwich hour angle
    gh = (280.1600 + 360.9856235 * d) % 360
    # Local hour angle
    lh = gh + lng - ra
    # Altitude
    lat_r = lat * RAD
    dec_r = dec * RAD
    alt = math.asin(math.sin(lat_r) * math.sin(dec_r) + math.cos(lat_r) * math.cos(dec_r) * math.cos(lh * RAD)) / RAD
    # Azimuth
    az = math.atan2(
        math.sin(lh * RAD),
        math.cos(lh * RAD) * math.sin(lat_r) - math.tan(dec_r) * math.cos(lat_r),
    ) / RAD
    return {"azimuth": az + 180, "altitude": alt}


def get_position(date: datetime.date | datetime.datetime, lat: float, lng: float) -> dict:
    d = _to_days(date)
    return _sun_position(d, lat, lng)


def _get_set_j(lat: float, lng: float, d: float, sun_elevation: float) -> float:
    """Day fraction of sunrise/set for a given solar elevation."""
    m = _solar_mean_anomaly(d)
    lon = _ecliptic_longitude(m)
    dec = _declination(lon)
    ra = _right_ascension(lon)
    ha = _hour_angle(lat, dec, sun_elevation)
    gh = (280.1600 + 360.9856235 * d) % 360
    # Sunrise = 360 - ha, Sunset = ha
    return ha / 360  # approximation


def _sunrise_sunset(lat: float, lng: float, d: float, sun_elevation: float) -> tuple[float, float, float]:
    """Returns (sunrise_j, sunset_j, noon_j) as Julian dates (not day fractions).

    Matches SunCalc.js getSunrise()/getSunset() approach.
    """
    m = _solar_mean_anomaly(d)
    lon = _ecliptic_longitude(m)
    dec = _declination(lon)
    ra = _right_ascension(lon)
    ha = _hour_angle(lat, dec, sun_elevation)
    gh = (280.1600 + 360.9856235 * d) % 360

    # Solar noon Julian date for this day
    noon_offset = (360 - gh - lng + ra) / 360
    noon_j = d + J2000 + noon_offset

    # Sunrise/set offsets in days
    sunrise_j = noon_j - ha / 360
    sunset_j = noon_j + ha / 360

    return sunrise_j, sunset_j, noon_j


def _j_to_datetime(julian: float) -> datetime.datetime:
    """Convert Julian date to datetime.

    Matches SunCalc.js fromJulian(): new Date((j + 0.5 - J1970) * dayMs)
    """
    unix_ts = (julian + 0.5 - J1970) * _SEC_PER_DAY
    return datetime.datetime.fromtimestamp(unix_ts, tz=datetime.timezone.utc)


def get_sun_times(lat: float, lon: float, date_str: str) -> dict:
    """Return sun phase times for a given date and location."""
    date = datetime.date.fromisoformat(date_str) if isinstance(date_str, str) else date_str
    d = _to_days(date)

    sunrise_j, sunset_j, noon_j = _sunrise_sunset(lat, lon, d, -0.833)
    dawn_j, dusk_j, _ = _sunrise_sunset(lat, lon, d, -6)
    nautical_dawn_j, nautical_dusk_j, _ = _sunrise_sunset(lat, lon, d, -12)
    night_end_j, night_start_j, _ = _sunrise_sunset(lat, lon, d, -18)

    return {
        "sunrise": _j_to_datetime(sunrise_j).isoformat(),
        "sunset": _j_to_datetime(sunset_j).isoformat(),
        "solar_noon": _j_to_datetime(noon_j).isoformat(),
        "golden_hour_am_start": _j_to_datetime(dawn_j).isoformat(),
        "golden_hour_am_end": _j_to_datetime(sunrise_j).isoformat(),
        "golden_hour_pm_start": _j_to_datetime(sunset_j).isoformat(),
        "golden_hour_pm_end": _j_to_datetime(dusk_j).isoformat(),
        "blue_hour_am_start": _j_to_datetime(nautical_dawn_j).isoformat(),
        "blue_hour_am_end": _j_to_datetime(dawn_j).isoformat(),
        "blue_hour_pm_start": _j_to_datetime(dusk_j).isoformat(),
        "blue_hour_pm_end": _j_to_datetime(nautical_dusk_j).isoformat(),
        "nautical_dawn": _j_to_datetime(nautical_dawn_j).isoformat(),
        "nautical_dusk": _j_to_datetime(nautical_dusk_j).isoformat(),
        "night_end": _j_to_datetime(night_end_j).isoformat(),
        "night_start": _j_to_datetime(night_start_j).isoformat(),
    }


def get_moon_data(lat: float, lon: float, date_str: str) -> dict:
    """Return basic moon phase data. Simplified — uses approximate formula."""
    date = datetime.date.fromisoformat(date_str) if isinstance(date_str, str) else date_str
    d = _to_days(date)

    # Approximate moon phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = third quarter
    phase = ((d / 29.53) % 1)
    illumination = (1 - math.cos(2 * math.pi * phase)) / 2

    # Phase name
    if phase < 0.025 or phase > 0.975:
        phase_name = "New Moon"
    elif phase < 0.125:
        phase_name = "Waxing Crescent"
    elif phase < 0.275:
        phase_name = "First Quarter"
    elif phase < 0.45:
        phase_name = "Waxing Gibbous"
    elif phase < 0.525:
        phase_name = "Full Moon"
    elif phase < 0.7:
        phase_name = "Waning Gibbous"
    elif phase < 0.725:
        phase_name = "Third Quarter"
    else:
        phase_name = "Waning Crescent"

    # Moon rise/set (simplified — shifted ~6h from sun each day)
    d_moon = d + phase * 0.5
    _, _, moon_noon_j = _sunrise_sunset(lat, lon, d_moon, -0.833)
    moon_rise_j = moon_noon_j - 0.25
    moon_set_j = moon_noon_j + 0.25

    return {
        "phase": phase_name,
        "phase_value": round(phase, 3),
        "illumination": round(illumination * 100, 1),
        "rise": _j_to_datetime(moon_rise_j).isoformat(),
        "set": _j_to_datetime(moon_set_j).isoformat(),
        "always_up": False,
        "always_down": False,
    }
