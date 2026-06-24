/* Northwind Weather — Main app controller */

let currentLat = null;
let currentLon = null;
let currentData = null;
let sunChartInstance = null;

// Global error catcher — shows JS errors on screen for diagnosis
window.onerror = function(msg, url, line, col, err) {
    const loading = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const msgEl = document.getElementById('error-msg');
    if (loading) loading.style.display = 'none';
    if (errorEl && msgEl) {
        msgEl.textContent = 'JS Error: ' + (err ? err.message : msg) + ' at ' + (url || '') + ':' + line;
        errorEl.style.display = 'flex';
    }
    return false;
};

// Diagnostics helper — writes to page so user can see execution progress
function diag(msg) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#333;color:#0ff;text-align:center;padding:3px;font:11px monospace;border-top:1px solid #555';
    d.textContent = '🔄 ' + msg;
    document.body.appendChild(d);
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        diag('init started');
        // Step 1: Get user location
        diag('getLocation START');
        const loc = await getLocation();
        diag('getLocation DONE: ' + loc.lat + ',' + loc.lon);
    currentLat = loc.lat;
    currentLon = loc.lon;

    // Update location display
    document.getElementById('today-location').textContent = loc.name || `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`;
    document.getElementById('today-date').textContent = formatDate(new Date().toISOString());

    // Init map
    initMap(currentLat, currentLon, onMapLocationChange);

    // Step 2: Fetch and render
    diag('fetchAndRender START');
    await fetchAndRender(currentLat, currentLon);
    diag('fetchAndRender DONE');

    // Step 3: Location input
    document.getElementById('location-input').addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            const q = this.value.trim();
            if (!q) return;
            // Try parsing as lat,lon
            const parts = q.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                await onLocationChange(parts[0], parts[1]);
                return;
            }
            // Geocode
            document.getElementById('loading').style.display = 'block';
            const result = await geocode(q);
            if (result) {
                document.getElementById('today-location').textContent = result.name;
                await onLocationChange(result.lat, result.lon);
            } else {
                showError('Location not found. Try "City, State" or "lat, lon"');
            }
            document.getElementById('loading').style.display = 'none';
        }
    });

    document.getElementById('locate-btn').addEventListener('click', async function() {
        document.getElementById('loading').style.display = 'block';
        const loc = await getLocation();
        document.getElementById('today-location').textContent = 'Current Location';
        await onLocationChange(loc.lat, loc.lon);
        document.getElementById('loading').style.display = 'none';
    });

    // Drone model selector sync
    document.getElementById('drone-select').addEventListener('change', function() {
        document.getElementById('drone-select-large').value = this.value;
        if (currentData) renderDroneViewForToday(currentData);
    });
    document.getElementById('drone-select-large').addEventListener('change', function() {
        document.getElementById('drone-select').value = this.value;
        if (currentData) renderDroneViewForToday(currentData);
    });
    } catch (e) {
        console.error('Init error:', e);
        document.getElementById('error-msg').textContent = 'App failed to initialize: ' + e.message;
        document.getElementById('error').style.display = 'flex';
        document.getElementById('loading').style.display = 'none';
    }
});

async function fetchAndRender(lat, lon) {
    diag('fetchAndRender: showing loading');
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';

    try {
        diag('fetchForecast CALL');
        const data = await fetchForecast(lat, lon, 7);
        diag('fetchForecast DONE, calling renderAll');
        currentData = data;
        currentLat = lat;
        currentLon = lon;

        renderAll(data);
        diag('renderAll DONE, hiding loading');
        document.getElementById('loading').style.display = 'none';
    } catch (err) {
        diag('ERROR: ' + err.message);
        showError('Failed to fetch weather data: ' + err.message);
        document.getElementById('loading').style.display = 'none';
    }
}

function renderAll(data) {
    if (!data || !data.daily || data.daily.length === 0) {
        showError('No forecast data available.');
        return;
    }

    const today = data.daily[0];
    if (!today) return;

    // Today card: phase badge
    updatePhaseBadge(today);

    // Sunrise/sunset
    document.getElementById('sunrise-time').textContent = formatTime(today.sun && today.sun.sunrise);
    document.getElementById('sunset-time').textContent = formatTime(today.sun && today.sun.sunset);
    document.getElementById('solar-noon').textContent = formatTime(today.sun && today.sun.solar_noon);

    // Sky score
    const cloudScore = (today.cloud_score && today.cloud_score.score) || 0;
    const scoreEl = document.getElementById('sky-score');
    scoreEl.textContent = cloudScore;
    scoreEl.className = 'big-score score-' + cloudScore;

    // METAR info
    const metarInfo = document.getElementById('metar-info');
    if (today.metar && today.metar.airport) {
        metarInfo.textContent = `📡 ${today.metar.airport.icao} (${today.metar.airport.distance_km}km)`;
    } else {
        metarInfo.textContent = '📡 Model data (no nearby airport)';
    }

    // Timeline
    if (window.renderTimeline) {
        renderTimeline(today.sun, today.hourly);
    }

    // Cloud diagram
    if (window.renderClouds) {
        renderClouds(today.metar && today.metar.latest, today.hourly);
    }

    // Moon
    if (window.renderMoonView) {
        renderMoonView(today.sun);
    }

    // Thunderstorm
    if (window.renderThunderstormView) {
        renderThunderstormView(today);
    }

    // Drone
    renderDroneViewForToday(today);

    // Sun path chart
    renderSunChart(today);

    // Map sun arc
    if (window.drawSunArc) {
        drawSunArc(today.sun || {});
    }

    // Week forecast
    renderWeekForecast(data.daily);

    // Notifications
    if (window.initNotifications) {
        initNotifications(data.daily);
    }
}

function renderDroneViewForToday(todayOrData) {
    const today = todayOrData && todayOrData.hourly ? todayOrData
        : (currentData && currentData.daily && currentData.daily[0]);
    if (!today || !window.renderDroneView) return;
    const model = document.getElementById('drone-select').value;
    renderDroneView(today.hourly, model);
}

function updatePhaseBadge(today) {
    const badge = document.getElementById('golden-hour-badge');
    const sun = today.sun || {};
    const now = new Date();

    const goldenAmStart = new Date(sun.golden_hour_am_start);
    const goldenAmEnd = new Date(sun.golden_hour_am_end);
    const goldenPmStart = new Date(sun.golden_hour_pm_start);
    const goldenPmEnd = new Date(sun.golden_hour_pm_end);
    const blueAmStart = new Date(sun.blue_hour_am_start);
    const blueAmEnd = new Date(sun.blue_hour_am_end);
    const bluePmStart = new Date(sun.blue_hour_pm_start);
    const bluePmEnd = new Date(sun.blue_hour_pm_end);
    const sunrise = new Date(sun.sunrise);
    const sunset = new Date(sun.sunset);

    badge.className = 'phase-badge';
    if (now >= goldenPmStart && now <= goldenPmEnd) {
        badge.textContent = '🌅 Golden Hour Now!';
        badge.classList.add('golden-hour');
    } else if (now >= goldenAmStart && now <= goldenAmEnd) {
        badge.textContent = '🌅 Golden Hour Now!';
        badge.classList.add('golden-hour');
    } else if (now >= bluePmStart && now <= bluePmEnd) {
        badge.textContent = '🌆 Blue Hour Now!';
        badge.classList.add('blue-hour');
    } else if (now >= blueAmStart && now <= blueAmEnd) {
        badge.textContent = '🌆 Blue Hour Now!';
        badge.classList.add('blue-hour');
    } else if (now >= sunrise && now <= sunset) {
        badge.textContent = '☀️ Daylight';
        badge.classList.add('day');
    } else {
        badge.textContent = '🌙 Night';
        badge.classList.add('night');
    }
}

function renderSunChart(today) {
    const canvas = document.getElementById('sunChart');
    if (!canvas) return;

    // Guard: Chart.js may not be loaded
    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML =
            '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">☀️ Sun chart unavailable offline</div>';
        return;
    }

    if (sunChartInstance) {
        sunChartInstance.destroy();
    }

    const sun = today.sun || {};
    const hourly = today.hourly || [];

    // Generate sun altitude for each hour of the day
    const labels = [];
    const altitudes = [];
    const goldenZone = [];
    const blueZone = [];

    const centerLat = currentLat || 47.6;
    const centerLon = currentLon || -122.3;
    const date = new Date(today.date + 'T12:00:00');

    for (let h = 0; h < 24; h++) {
        const time = new Date(date);
        time.setHours(h, 30, 0, 0);
        const pos = SunCalc.getPosition(time, centerLat, centerLon);
        labels.push(h.toString().padStart(2, '0') + ':00');
        const alt = pos.altitude * (180 / Math.PI);
        altitudes.push(parseFloat(alt.toFixed(1)));
        goldenZone.push(alt >= -6 && alt <= 0 ? -6 : null);
        blueZone.push(alt >= -12 && alt < -6 ? -12 : null);
    }

    sunChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sun Altitude (°)',
                    data: altitudes,
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.parsed.y + '° altitude';
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#606080', maxTicksLimit: 8 },
                },
                y: {
                    min: -18,
                    max: 90,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#606080' },
                },
            },
        },
        plugins: [{
            id: 'altitudeBands',
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                const yScale = chart.scales.y;
                const xScale = chart.scales.x;

                // Golden hour band (-6 to 0)
                const y0_golden = yScale.getPixelForValue(0);
                const y6_golden = yScale.getPixelForValue(-6);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
                ctx.fillRect(xScale.left, y0_golden, xScale.width, y6_golden - y0_golden);

                // Blue hour band (-12 to -6)
                const y12 = yScale.getPixelForValue(-12);
                ctx.fillStyle = 'rgba(65, 105, 225, 0.08)';
                ctx.fillRect(xScale.left, y6_golden, xScale.width, y12 - y6_golden);

                // Labels
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.font = '10px sans-serif';
                ctx.fillText('GOLDEN', xScale.left + 4, y0_golden + 4);
                ctx.fillStyle = 'rgba(65, 105, 225, 0.3)';
                ctx.fillText('BLUE', xScale.left + 4, y6_golden + 14);
            },
        }],
    });
}

function renderWeekForecast(dailyData) {
    const container = document.getElementById('week-cards');
    if (!container || !dailyData) return;

    const now = new Date();

    container.innerHTML = dailyData.map((day, idx) => {
        const score = (day.cloud_score && day.cloud_score.score) || 0;
        const isHighScore = score >= 7;
        const date = new Date(day.date + 'T12:00:00');
        const dayName = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const sunrise = formatTime(day.sun && day.sun.sunrise);
        const sunset = formatTime(day.sun && day.sun.sunset);
        const moonPhase = (day.sun && day.sun.moon && day.sun.moon.phase) || '';
        const moonIcon = MOON_ICONS[moonPhase] || '';

        // Drone status for day
        let droneIcon = '🟢';
        if (day.hourly) {
            const maxWind = Math.max(...day.hourly.map(h => h.wind_speed_10m || 0));
            if (maxWind > 10) droneIcon = '🔴';
            else if (maxWind > 6) droneIcon = '🟡';
        }

        // Storm score
        const stormScore = (day.storm_photo && day.storm_photo.score) || 0;
        const stormIcon = stormScore >= 8 ? '⚡' : '';

        return `
            <div class="week-card ${isHighScore ? 'high-score' : ''} ${idx === 0 ? 'active' : ''}" onclick="scrollToDay(${idx})">
                ${isHighScore ? '<span class="star">🌟</span>' : ''}
                <div class="day-name">${dayName}</div>
                <div class="day-date">${dateStr}</div>
                <div class="day-score score-${score}">${score}</div>
                <div class="day-sun">🌅 ${sunrise} / ${sunset}</div>
                <div class="day-drone">${droneIcon} ${stormIcon}</div>
                <div class="day-moon">${moonIcon}</div>
            </div>
        `;
    }).join('');
}

function scrollToDay(idx) {
    // Highlight selected day's card in week
    document.querySelectorAll('.week-card').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
    });

    // Could scroll to that day's details in a future enhancement
}

function onMapLocationChange(lat, lon) {
    currentLat = lat;
    currentLon = lon;
    updateMapPosition(lat, lon);
    document.getElementById('today-location').textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    fetchAndRender(lat, lon);
}

function onLocationChange(lat, lon) {
    currentLat = lat;
    currentLon = lon;
    updateMapPosition(lat, lon);
    document.getElementById('today-location').textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    fetchAndRender(lat, lon);
}

function showError(msg) {
    const err = document.getElementById('error');
    const msgEl = document.getElementById('error-msg');
    if (err && msgEl) {
        msgEl.textContent = msg;
        err.style.display = 'flex';
    }
}
