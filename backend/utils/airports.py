"""Airport database with nearest-airport lookup via haversine."""

from __future__ import annotations

import math
from typing import NamedTuple

# ~200 US airports with ICAO codes
AIRPORTS: dict[str, dict[str, float | str]] = {
    # Major hubs
    "KATL": {"lat": 33.6407, "lon": -84.4277, "name": "Atlanta"},
    "KBOS": {"lat": 42.3656, "lon": -71.0096, "name": "Boston"},
    "KBWI": {"lat": 39.1754, "lon": -76.6682, "name": "Baltimore/Washington"},
    "KCLT": {"lat": 35.2140, "lon": -80.9431, "name": "Charlotte"},
    "KDEN": {"lat": 39.8561, "lon": -104.6737, "name": "Denver"},
    "KDFW": {"lat": 32.8998, "lon": -97.0403, "name": "Dallas/Fort Worth"},
    "KDTW": {"lat": 42.2124, "lon": -83.3534, "name": "Detroit"},
    "KEWR": {"lat": 40.6895, "lon": -74.1745, "name": "Newark"},
    "KIAH": {"lat": 29.9844, "lon": -95.3414, "name": "Houston"},
    "KJFK": {"lat": 40.6413, "lon": -73.7781, "name": "New York JFK"},
    "KLAS": {"lat": 36.0840, "lon": -115.1537, "name": "Las Vegas"},
    "KLAX": {"lat": 33.9425, "lon": -118.4081, "name": "Los Angeles"},
    "KMCO": {"lat": 28.4289, "lon": -81.3080, "name": "Orlando"},
    "KMDW": {"lat": 41.7853, "lon": -87.7524, "name": "Chicago Midway"},
    "KMEM": {"lat": 35.0424, "lon": -89.9767, "name": "Memphis"},
    "KMIA": {"lat": 25.7959, "lon": -80.2871, "name": "Miami"},
    "KMSP": {"lat": 44.8820, "lon": -93.2218, "name": "Minneapolis"},
    "KORD": {"lat": 41.9742, "lon": -87.9073, "name": "Chicago O'Hare"},
    "KPHL": {"lat": 39.8726, "lon": -75.2437, "name": "Philadelphia"},
    "KPHX": {"lat": 33.4342, "lon": -112.0087, "name": "Phoenix"},
    "KPDX": {"lat": 45.5887, "lon": -122.5975, "name": "Portland"},
    "KRDU": {"lat": 35.8776, "lon": -78.7874, "name": "Raleigh-Durham"},
    "KSFO": {"lat": 37.6213, "lon": -122.3790, "name": "San Francisco"},
    "KSLC": {"lat": 40.7899, "lon": -111.9791, "name": "Salt Lake City"},
    "KSEA": {"lat": 47.4489, "lon": -122.3094, "name": "Seattle"},
    "KTPA": {"lat": 27.9755, "lon": -82.5332, "name": "Tampa"},
    "KDCA": {"lat": 38.8521, "lon": -77.0377, "name": "Washington Reagan"},
    "KIAD": {"lat": 38.9445, "lon": -77.4558, "name": "Washington Dulles"},
    # Regional
    "KABQ": {"lat": 35.0402, "lon": -106.6098, "name": "Albuquerque"},
    "KANC": {"lat": 44.7000, "lon": -93.4833, "name": "Anchorage"},
    "KAUS": {"lat": 30.1945, "lon": -97.6699, "name": "Austin"},
    "KBDL": {"lat": 41.9389, "lon": -72.6832, "name": "Hartford"},
    "KBLI": {"lat": 48.7928, "lon": -122.5378, "name": "Bellingham"},
    "KBOI": {"lat": 43.5644, "lon": -116.2224, "name": "Boise"},
    "KBTV": {"lat": 44.4682, "lon": -73.1540, "name": "Burlington"},
    "KBUF": {"lat": 42.9408, "lon": -78.7316, "name": "Buffalo"},
    "KBUR": {"lat": 34.2007, "lon": -118.3593, "name": "Burbank"},
    "KCLE": {"lat": 41.4045, "lon": -81.8491, "name": "Cleveland"},
    "KCMH": {"lat": 39.9981, "lon": -82.8919, "name": "Columbus"},
    "KCRW": {"lat": 38.3732, "lon": -81.5936, "name": "Charleston WV"},
    "KCVG": {"lat": 39.0488, "lon": -84.6678, "name": "Cincinnati"},
    "KDAY": {"lat": 39.9024, "lon": -84.2193, "name": "Dayton"},
    "KDSM": {"lat": 41.5334, "lon": -93.6631, "name": "Des Moines"},
    "KELP": {"lat": 31.8069, "lon": -106.3778, "name": "El Paso"},
    "KFAT": {"lat": 36.7762, "lon": -119.7182, "name": "Fresno"},
    "KFLL": {"lat": 26.0745, "lon": -80.1496, "name": "Fort Lauderdale"},
    "KFNT": {"lat": 42.9828, "lon": -83.7443, "name": "Flint"},
    "KFWA": {"lat": 40.9785, "lon": -85.1957, "name": "Fort Wayne"},
    "KGEG": {"lat": 47.6200, "lon": -117.5288, "name": "Spokane"},
    "KGSO": {"lat": 36.0978, "lon": -79.9373, "name": "Greensboro"},
    "KHNL": {"lat": 21.3250, "lon": -157.9250, "name": "Honolulu"},
    "KHSV": {"lat": 34.6375, "lon": -86.7755, "name": "Huntsville"},
    "KIND": {"lat": 39.7173, "lon": -86.2944, "name": "Indianapolis"},
    "KJAX": {"lat": 30.4941, "lon": -81.6879, "name": "Jacksonville"},
    "KMCI": {"lat": 39.2998, "lon": -94.7136, "name": "Kansas City"},
    "KMDT": {"lat": 40.1935, "lon": -76.7640, "name": "Harrisburg"},
    "KMSO": {"lat": 46.9163, "lon": -114.0906, "name": "Missoula"},
    "KMYR": {"lat": 33.6791, "lon": -78.9271, "name": "Myrtle Beach"},
    "KOAK": {"lat": 37.7213, "lon": -122.2212, "name": "Oakland"},
    "KOGD": {"lat": 41.1933, "lon": -112.0125, "name": "Ogden"},
    "KOKC": {"lat": 35.3931, "lon": -97.6007, "name": "Oklahoma City"},
    "KOMA": {"lat": 41.3030, "lon": -95.8939, "name": "Omaha"},
    "KORF": {"lat": 36.8945, "lon": -76.2015, "name": "Norfolk"},
    "KPBI": {"lat": 26.6832, "lon": -80.0956, "name": "West Palm Beach"},
    "KPDT": {"lat": 45.6942, "lon": -118.8467, "name": "Pendleton"},
    "KPIT": {"lat": 40.4914, "lon": -80.2329, "name": "Pittsburgh"},
    "KPSC": {"lat": 46.2647, "lon": -119.1039, "name": "Pasco"},
    "KPSP": {"lat": 33.8297, "lon": -116.5092, "name": "Palm Springs"},
    "KPWM": {"lat": 43.6461, "lon": -70.3094, "name": "Portland ME"},
    "KRAP": {"lat": 44.0453, "lon": -103.0579, "name": "Rapid City"},
    "KRDD": {"lat": 40.5089, "lon": -122.2932, "name": "Redding"},
    "KRNO": {"lat": 39.4988, "lon": -119.7740, "name": "Reno"},
    "KROC": {"lat": 43.1189, "lon": -77.6724, "name": "Rochester"},
    "KROW": {"lat": 33.3090, "lon": -104.5307, "name": "Roswell"},
    "KSAN": {"lat": 32.7336, "lon": -117.1897, "name": "San Diego"},
    "KSAT": {"lat": 29.5337, "lon": -98.4698, "name": "San Antonio"},
    "KSAV": {"lat": 32.1275, "lon": -81.2022, "name": "Savannah"},
    "KSMF": {"lat": 38.6954, "lon": -121.5908, "name": "Sacramento"},
    "KSNA": {"lat": 33.6758, "lon": -117.8684, "name": "Orange County"},
    "KSTL": {"lat": 38.7487, "lon": -90.3700, "name": "St. Louis"},
    "KSYR": {"lat": 43.1112, "lon": -76.1063, "name": "Syracuse"},
    "KTUL": {"lat": 36.1984, "lon": -95.8881, "name": "Tulsa"},
    "KTUS": {"lat": 32.1160, "lon": -110.9409, "name": "Tucson"},
    "KYKM": {"lat": 46.6092, "lon": -120.5430, "name": "Yakima"},
    "KYUM": {"lat": 32.6566, "lon": -114.6058, "name": "Yuma"},
    # Scenic / photography hotspots
    "KGCN": {"lat": 35.9522, "lon": -112.1470, "name": "Grand Canyon"},
    "KOGD": {"lat": 41.1933, "lon": -112.0125, "name": "Ogden/Great Salt Lake"},
    "KMWH": {"lat": 47.2075, "lon": -119.3200, "name": "Moses Lake"},
    "KSBA": {"lat": 34.4262, "lon": -119.8404, "name": "Santa Barbara"},
    "KMRY": {"lat": 36.5870, "lon": -121.8429, "name": "Monterey"},
    "KSBP": {"lat": 35.2369, "lon": -120.6384, "name": "San Luis Obispo"},
    "KASE": {"lat": 39.2232, "lon": -106.8689, "name": "Aspen"},
    "KEGE": {"lat": 39.6426, "lon": -106.9177, "name": "Eagle/Vail"},
    "KTEX": {"lat": 37.9538, "lon": -107.9085, "name": "Telluride"},
    "KJAC": {"lat": 43.6073, "lon": -110.7377, "name": "Jackson Hole"},
    "KBTM": {"lat": 45.9470, "lon": -112.2944, "name": "Butte"},
    "KFCA": {"lat": 48.3103, "lon": -114.2562, "name": "Glacier Park"},
    "KBZN": {"lat": 45.7772, "lon": -111.1603, "name": "Bozeman"},
    "KSCK": {"lat": 37.8942, "lon": -121.2386, "name": "Stockton"},
    "KEUG": {"lat": 44.1242, "lon": -123.2114, "name": "Eugene"},
    "KMFR": {"lat": 42.3742, "lon": -122.8733, "name": "Medford"},
    "KACV": {"lat": 40.9781, "lon": -124.1086, "name": "Arcata/Eureka"},
    "KCEC": {"lat": 41.7803, "lon": -124.2367, "name": "Crescent City"},
    "KAST": {"lat": 46.1583, "lon": -123.8786, "name": "Astoria"},
    "KOTH": {"lat": 43.4172, "lon": -124.2464, "name": "North Bend"},
    "KUKI": {"lat": 39.1256, "lon": -123.2009, "name": "Ukiah"},
    "KLKV": {"lat": 42.1561, "lon": -120.3992, "name": "Lakeview"},
    "KLMT": {"lat": 42.1561, "lon": -121.7331, "name": "Klamath Falls"},
    "KRDM": {"lat": 44.2541, "lon": -121.1499, "name": "Redmond/Bend"},
    "KSLE": {"lat": 44.9095, "lon": -123.0026, "name": "Salem"},
    "KHQM": {"lat": 46.9713, "lon": -123.9372, "name": "Hoquiam"},
    "KCLM": {"lat": 48.1198, "lon": -123.4995, "name": "Port Angeles"},
    "KALW": {"lat": 46.0949, "lon": -118.2880, "name": "Walla Walla"},
    "KLWS": {"lat": 46.3758, "lon": -117.0156, "name": "Lewiston"},
    "KCOD": {"lat": 44.5203, "lon": -109.0238, "name": "Cody"},
    "KPIH": {"lat": 42.9098, "lon": -112.5967, "name": "Pocatello"},
    "KIDA": {"lat": 43.5146, "lon": -112.0711, "name": "Idaho Falls"},
    "KDIJ": {"lat": 43.7435, "lon": -111.0951, "name": "Driggs"},
    "KSUN": {"lat": 43.5044, "lon": -114.2963, "name": "Sun Valley"},
    "KEKO": {"lat": 40.7835, "lon": -116.0950, "name": "Elko"},
    "KWMC": {"lat": 40.8964, "lon": -117.8059, "name": "Winnemucca"},
    "KMMH": {"lat": 37.6243, "lon": -118.8365, "name": "Mammoth Yosemite"},
    "KBIH": {"lat": 37.3731, "lon": -118.3636, "name": "Bishop"},
    "KSVE": {"lat": 39.7822, "lon": -120.0797, "name": "Susanville"},
    "KTRK": {"lat": 39.6240, "lon": -120.1400, "name": "Truckee"},
    "KTVL": {"lat": 38.8939, "lon": -119.9954, "name": "South Lake Tahoe"},
    "KCXP": {"lat": 39.1916, "lon": -119.7371, "name": "Carson City"},
    "KELY": {"lat": 39.2994, "lon": -114.8417, "name": "Ely"},
    "KCCU": {"lat": 44.7622, "lon": -120.4592, "name": "Culbertson"},
}


class AirportResult(NamedTuple):
    icao: str
    name: str
    lat: float
    lon: float
    distance_km: float


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_airport(lat: float, lon: float, radius_km: int = 50) -> AirportResult | None:
    """Find the nearest airport within radius_km. Expands search up to 150km."""
    best = None
    best_dist = float("inf")

    for icao, info in AIRPORTS.items():
        dist = _haversine(lat, lon, info["lat"], info["lon"])
        if dist < best_dist:
            best_dist = dist
            best = AirportResult(
                icao=icao,
                name=info["name"],
                lat=info["lat"],
                lon=info["lon"],
                distance_km=round(dist, 1),
            )

    if best is None:
        return None

    # Expand search radius in 25km steps
    current_radius = radius_km
    while current_radius <= 150:
        if best.distance_km <= current_radius:
            return best
        current_radius += 25

    return None
