# Northwind Weather

A photography-focused weather app for photographers and drone pilots. Shows golden hour, blue hour, cloud layers (from METAR), drone flyability, moon phases, storm photo opportunities, and red sun predictions.

Built with FastAPI (Python) + vanilla JS. All data from free APIs (Open-Meteo, AviationWeather.gov, SunCalc.js).

## Quick Start

```bash
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --host 0.0.0.0 --port 8080
```

Open http://localhost:8080

## Deploy to Fly.io

```bash
fly launch --import .  # First time
fly deploy              # After changes
```

## Features

- ☀️ **Golden & Blue Hour** — precise timing with 24h timeline bar
- ☁️ **Cloud Layers** — METAR cloud type/coverage from nearest airport
- 🛸 **Drone Conditions** — fly/no-fly thresholds for Mini/Air/Mavic
- 🌙 **Moon Tracker** — phase, illumination, rise/set, supermoon flags
- ⛈️ **Storm Photo Alerts** — isolated storms near clear sky = photogenic
- 🔴 **Red Sun Predictions** — aerosol optical depth + cloud cover
- 🗺️ **Interactive Map** — Leaflet with draggable marker
- 📅 **7-Day Forecast** — scrollable cards with combined scores
- 🔔 **Push Notifications** — browser alerts for high-score days

## Data Sources

| Source | Data | Cost |
|--------|------|------|
| Open-Meteo | Weather forecast, air quality, CAPE | Free (no key) |
| AviationWeather.gov | METAR cloud layers, type, wind | Free (no key) |
| SunCalc.js | Sunrise/set, golden/blue hour, moon | Free (client-side) |
| OpenStreetMap | Geocoding, map tiles | Free (attribution) |

## API

`GET /api/forecast?lat=44.98&lon=-93.27&days=7`

Returns combined JSON with sun, weather, METAR, AQI, storm, and cloud score data.

## License

MIT
