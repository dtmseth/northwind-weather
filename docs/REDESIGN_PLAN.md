# Northwind Weather — UI Redesign & Feature Plan

**Status:** Plan / not yet implemented
**Last updated:** 2026-06-24
**Owner:** seth@northwindvisuals.com

A plan to restructure the app into a clean multi-page layout, fix outstanding
bugs, reduce visual clutter (fewer emoji), and add richer cloud / radar / alert
data. Plan only — no app code has been changed for this document.

---

## 1. Goals

1. **Clean, restructured layout** — move from one long scroll to a multi-page
   app with a bottom tab bar. Restructure freely where the current layout feels
   off; the priority is that it looks and feels clean and intentional.
2. **Reduce emoji** — they read as cheap and often don't fit. Replace decorative
   emoji with thin outline (line) icons. Keep emoji only where it *is* the data
   or is thematically exact (moon-phase glyph, a few weather states).
3. **Cloud types where possible** — surface real cloud genus when reported, and
   a clearly-labeled "likely" type otherwise (see §5).
4. **Better storm data** — fix the storms tile so it reflects the *selected
   location*, using live warnings + radar, not just model output.
5. **More detail on sparse tiles** — tap a forecast day to expand into full
   hourly detail; add an hourly view to the 7-day forecast.
6. **Full PWA push notifications** — installable app + working OS notifications.
7. **Radar + satellite over the map** — most-detailed-possible cloud/storm view.

---

## 2. Bugs found (fix first)

Grounded in reading the code and live API tests.

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| B1 | Header sits under the Dynamic Island on iPhone 16 | `#header` uses `padding: 16px 0` with no safe-area inset, despite `viewport-fit=cover` ([style.css:38](../frontend/css/style.css)) | Add `env(safe-area-inset-top)` to header/app top padding; `env(safe-area-inset-bottom)` to the new bottom nav |
| B2 | Bell does nothing | On iOS Safari (non-installed tab) `Notification` API is absent, so the handler bails ([notifications.js:27](../frontend/js/notifications.js)). Listener is also re-bound on every render (stacks duplicates) | In-app alerts panel that works everywhere + PWA install for real push (§7); bind the click listener once |
| B3 | Storms tile blank during real storms | `_detect_storms` is model-only and brittle: fires only on `weather_code 95/96/99` **or** `CAPE>1500 AND cloud_cover<65`; widespread storms have cover >65 so the CAPE branch dies ([main.py:263](../backend/main.py)) | Loosen heuristic + add live NWS warnings & RainViewer nowcast for the selected point (§6, §8) |
| B4 | Golden/blue hour tile is mostly text & redundant | `sunTimeline.js` renders ~11 overlapping labels + 4 text boxes that duplicate the sun-path chart ([sunTimeline.js](../frontend/js/sunTimeline.js)) | Delete the tile; replace with a slim golden-hour **bar** on Today (sunrise/sunset at the ends, now-marker) + keep the sun-path chart on the Sun page |
| B5 | Red-sun prediction uses global AOD | `_predict_red_sun` takes `max(aod_vals)` across all days, not per-day ([main.py:289](../backend/main.py)) | Scope AOD max to the day being scored |

**Not a bug (verified):** missing cloud *types* at Chicago. US automated
stations don't report genus — see §5.

---

## 3. Information architecture — multi-page shell

Replace the single scroll with five routes behind a fixed bottom tab bar
(hash-router, no framework). Most sections already exist as components; this is
largely re-homing them into page containers + a `nav` component.

| Tab | Icon | Contents |
|-----|------|----------|
| **Today** | `home` | Location header, alerts strip, golden-hour bar, metric tiles (Clouds / Sky score / Drone), current conditions |
| **Sky** | `cloud` | Full cloud visualization: typed layers, current/hourly toggle, combined airport + model sources |
| **Radar** | `radar` | Leaflet map with RainViewer radar/satellite overlays + NWS alert polygons |
| **7-day** | `calendar` | Forecast list; tap a day to expand into hourly detail |
| **Sun** | `moon` | Sun-path chart, moon phase (keeps the moon glyph), golden/blue hour detail |

A reference mockup of Today / Sky / Radar / 7-day was produced in the planning
session (iPhone-framed, line-icon nav, dark theme).

---

## 4. Visual / design direction

- **Line icons, not emoji.** Decorative emoji → thin outline icons (nav, alerts,
  weather states). Zero emoji in chrome.
- **Emoji kept only where it's the data:** moon-phase glyph on the Sun page; a
  small number of weather state markers where the glyph reads as content.
- **Today leads with signal, not chrome:** alerts strip first (good *or* bad),
  then the golden-hour bar, then three honest metric tiles.
- **Pure cloud score** on Today — cloud cover %/state only, *not* the
  light/interest composite. The composite "Sky score" stays as its own tile so
  the two questions ("how cloudy" vs "how good for photos") are separable.
- **Consistent cards:** one card style, generous spacing, fewer competing accent
  colors. Gold = golden hour / highlight; semantic green/amber/red for status.

---

## 5. Cloud types — strategy & data finding

**Finding (verified live):** Scanned 48 major US airports — **0** returned a
cloud `type` field; only KICT showed a type (`SCT006CB`) because it had an active
thunderstorm. US automated stations (ASOS/AWOS) report only cloud **cover +
height**; genus appears only as `CB`/`TCU` during significant convection. There
is no reliable free genus API. So "type where possible" is a three-source blend:

1. **Real type from METAR** — `CB`/`TCU` parsed from the raw report. Already
   implemented ([metar.py](../backend/api/metar.py) `_parse_cloud_types`).
2. **Inferred "likely" type** — from altitude band + coverage + Open-Meteo
   low/mid/high cover + instability (CAPE). Labeled "likely" so it's never
   presented as observed fact:
   - High / thin → *likely cirrus* (BKN/OVC → cirrostratus)
   - Mid → *likely altocumulus* (BKN/OVC → altostratus)
   - Low + scattered + unstable → *cumulus*; low + overcast + precip →
     *stratus / nimbostratus*; building + high CAPE → *towering cumulus / Cb*
3. **Per-location model layers** — Open-Meteo `cloud_cover_low/mid/high` at the
   exact lat/lon (already fetched, currently unused) shown next to the trusted
   airport obs, so there's always location-specific data.

Airport observation stays visually primary (it's the trusted source); inferred
and model data are clearly secondary.

---

## 6. Storms — corrected approach

The storms tile already uses model data at the selected lat/lon (not the
airport, contrary to first guess) — but it's model-only and brittle. New design,
three layers:

1. **Live NWS warnings** (`/alerts/active?point=lat,lon`) — authoritative,
   location-specific, drives the red/amber alerts strip. *Verified working
   (US-only, needs User-Agent).*
2. **RainViewer nowcast** — "is it actually storming on me right now" from radar.
3. **Model heuristic (loosened)** — CAPE / lifted index / weather-code for the
   photography-opportunity score; drop the `cloud_cover<65` gate on the CAPE
   branch and include heavy-shower codes (80–82) so it's never blank when
   weather is clearly happening.

---

## 7. Notifications — full PWA push

- Add `manifest.json` (icons already exist in `frontend/img/`) + a service
  worker so the app is installable to the home screen — the only path to iOS web
  push.
- Bell behavior: always opens an **in-app alerts panel** (great days + active
  weather alerts); OS push is progressive enhancement once installed.
- Fix the duplicate-listener bug (bind once, not per render).
- Push triggers: high photo-score days (existing logic) + new severe-weather
  alerts for the saved location.

---

## 8. Data sources (all free, verified)

| Source | Use | Key? | Notes |
|--------|-----|------|-------|
| **Open-Meteo forecast** | temp, wind (m/s), cloud low/mid/high, CAPE, AOD | No | Already used; surface low/mid/high |
| **AviationWeather METAR** | trusted airport obs: cover, height, CB/TCU, wind | No | Already used |
| **NWS api.weather.gov** | active alerts by point, per-location hourly, radar station | No | US-only; requires `User-Agent` header |
| **RainViewer** | animated radar (past + nowcast), infrared satellite tiles | No | Leaflet overlay; satellite frames intermittent — radar primary |
| **Open-Meteo Air-Quality** | AQI, aerosol optical depth (red-sun) | No | Already used |

Map overlays via Leaflet `L.tileLayer` (RainViewer tile URL template). Optional
US fallback: Iowa Environmental Mesonet NEXRAD WMS.

---

## 9. Optimizations

- Cache new NWS / RainViewer responses in the existing
  [cache](../backend/utils/cache.py) with short TTLs (alerts ~2 min, radar index
  ~5 min).
- Parallelize NWS / RainViewer fetches alongside the existing Open-Meteo / METAR
  calls in the combined forecast endpoint.
- Service worker caches the app shell (offline-friendly + faster loads).
- Keep `.dockerignore` lean (already added) so images stay ~50 MB.

---

## 10. Phasing

**Phase 1 — quick wins (high-visibility, low-risk)**
- Safe-area header fix (B1)
- Storm heuristic fix + surface CAPE/LI (B3, partial)
- Golden-hour bar on Today; remove old golden/blue tile (B4)
- Pure cloud-cover score on Today
- Notification listener bug (B2, partial)
- Red-sun per-day AOD (B5)

**Phase 2 — page shell**
- Bottom tab bar + hash router; move sections into Today / Sky / Radar / 7-day /
  Sun pages
- Emoji → line icons across chrome

**Phase 3 — radar & alerts**
- RainViewer radar/satellite overlays on the map page
- NWS active-alerts integration → alerts strip + storms tile

**Phase 4 — depth & install**
- 7-day: tap-to-expand hourly detail + hourly view
- Combined cloud sources + "likely type" inference on the Sky page
- PWA manifest + service worker + OS push

---

## 11. Open questions

- Lock the five-tab structure, or fold Sun into Today?
- Non-US locations: NWS is US-only — fall back to Open-Meteo/model alerts
  elsewhere (no government warnings available)?
- Default landing tab — Today, or remember last used?
