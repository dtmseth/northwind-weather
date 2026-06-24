/* Northwind Weather — Leaflet map with location picker + sun arc */

let map = null;
let marker = null;
let mapLocationCallback = null;
let sunArcs = [];
let radarLayer = null;
let radarOverlayActive = false;

window.initMap = function(lat, lon, callback) {
    mapLocationCallback = callback;

    // Guard: Leaflet might not have loaded
    if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded — map unavailable');
        document.getElementById('map').innerHTML =
            '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">🗺️ Map unavailable offline</div>';
        return;
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    map = L.map('map', {
        center: [lat, lon],
        zoom: 10,
        zoomControl: true,
        attributionControl: false,
    });

    // Store globally so router can call invalidateSize when page becomes visible
    window._mapInstance = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
    }).addTo(map);

    marker = L.marker([lat, lon], {
        draggable: true,
    }).addTo(map);

    marker.on('dragend', function() {
        const pos = marker.getLatLng();
        if (mapLocationCallback) mapLocationCallback(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        if (mapLocationCallback) mapLocationCallback(e.latlng.lat, e.latlng.lng);
    });
};

window.updateMapPosition = function(lat, lon) {
    if (map && marker) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], map.getZoom());
    }
};

window.drawSunArc = function(sunData) {
    if (!map || !sunData) return;

    // Remove old arcs
    sunArcs.forEach(a => map.removeLayer(a));
    sunArcs = [];

    const sunrise = sunData.sunrise;
    const sunset = sunData.sunset;
    if (!sunrise || !sunset) return;

    // Draw sun path as a series of points from sunrise to noon to sunset
    const center = marker ? marker.getLatLng() : map.getCenter();
    const points = [];
    const steps = 24;

    for (let i = 0; i <= steps; i++) {
        const fraction = i / steps;
        const totalMinutes = (parseHour(sunset) * 60 + parseInt(sunset.slice(3, 5) || 0))
            - (parseHour(sunrise) * 60 + parseInt(sunrise.slice(3, 5) || 0));
        const minutes = (parseHour(sunrise) * 60 + parseInt(sunrise.slice(3, 5) || 0)) + totalMinutes * fraction;

        const h = Math.floor(minutes / 60);
        const m = minutes % 60;

        const date = new Date();
        date.setHours(h, m, 0, 0);

        const pos = SunCalc.getPosition(date, center.lat, center.lng);
        // azimuth in radians, convert to approx offset
        // Note: This is a simplified arc - not precise azimuth but visually representative
        const azRad = pos.azimuth;
        const altRad = pos.altitude;

        if (altRad > 0) {
            // Approximate offset from center based on azimuth
            const dist = 0.01 + (altRad / Math.PI) * 0.02;
            const dlat = dist * Math.cos(azRad);
            const dlon = dist * Math.sin(azRad);
            points.push([center.lat + dlat, center.lng + dlon]);
        }
    }

    if (points.length > 2) {
        const arc = L.polyline(points, {
            color: '#ffd700',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 5',
        }).addTo(map);
        sunArcs.push(arc);
    }
};

/* Radar overlay */
window.addRadarOverlay = async function() {
    const btn = document.getElementById('radar-toggle-btn');
    if (!map) return;

    if (radarOverlayActive) {
        // Turn off
        if (radarLayer) {
            map.removeLayer(radarLayer);
            radarLayer = null;
        }
        radarOverlayActive = false;
        if (btn) btn.textContent = 'Radar';
        return;
    }

    try {
        if (btn) btn.textContent = '...';
        const resp = await fetch('/api/nws/radar');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.past || data.past.length === 0) return;
        const latest = data.past[data.past.length - 1];
        const tileUrl = data.host + latest.path + '/256/{z}/{x}/{y}/2/1_1.png';
        radarLayer = L.tileLayer(tileUrl, { opacity: 0.6, tileSize: 256 }).addTo(map);
        radarOverlayActive = true;
        if (btn) btn.textContent = 'Off';
    } catch (err) {
        console.warn('Radar overlay error:', err);
        if (btn) btn.textContent = 'Radar';
    }
};
