/* Northwind Weather — API client */

const API_BASE = '/api';

async function fetchForecast(lat, lon, days = 7) {
    const resp = await fetch(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&days=${days}`);
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return resp.json();
}

async function fetchWeather(lat, lon, days = 7) {
    const resp = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}&days=${days}`);
    if (!resp.ok) throw new Error(`Weather API error: ${resp.status}`);
    return resp.json();
}

async function fetchAqi(lat, lon) {
    const resp = await fetch(`${API_BASE}/aqi?lat=${lat}&lon=${lon}`);
    if (!resp.ok) throw new Error(`AQI API error: ${resp.status}`);
    return resp.json();
}

async function fetchMetarNearest(lat, lon) {
    const resp = await fetch(`${API_BASE}/metar/nearest?lat=${lat}&lon=${lon}`);
    if (!resp.ok) throw new Error(`METAR API error: ${resp.status}`);
    return resp.json();
}

async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'NorthwindWeather/1.0' } });
    if (!resp.ok) throw new Error('Geocoding failed');
    const data = await resp.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name };
}

async function geocodeSuggestions(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'NorthwindWeather/1.0' } });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data || []).map(r => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        name: r.display_name
    }));
}

function getLocation() {
    return new Promise((resolve) => {
        // Hard timeout: resolve with default if geolocation hangs (common on iOS)
        const timeout = setTimeout(() => {
            resolve({ lat: 47.6062, lon: -122.3321, name: 'Seattle' });
        }, 5000);

        if (!navigator.geolocation) {
            clearTimeout(timeout);
            resolve({ lat: 47.6062, lon: -122.3321, name: 'Seattle' });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timeout);
                resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Current Location' });
            },
            () => {
                clearTimeout(timeout);
                resolve({ lat: 47.6062, lon: -122.3321, name: 'Seattle' });
            },
            { timeout: 4000, enableHighAccuracy: false }
        );
    });
}
