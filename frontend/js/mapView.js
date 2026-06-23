/* Northwind Weather — Leaflet map with location picker + sun arc */

let map = null;
let marker = null;
let onLocationChange = null;
let sunArcs = [];

window.initMap = function(lat, lon, callback) {
    onLocationChange = callback;

    // Wait for Leaflet
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
    }).addTo(map);

    marker = L.marker([lat, lon], {
        draggable: true,
    }).addTo(map);

    marker.on('dragend', function() {
        const pos = marker.getLatLng();
        if (onLocationChange) onLocationChange(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        if (onLocationChange) onLocationChange(e.latlng.lat, e.latlng.lng);
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
