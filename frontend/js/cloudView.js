/* Northwind Weather — cloud sky visualization */

// Module state so the current/hourly toggle can re-render the last data set.
let _cloudState = { metar: null, hourly: [], containerId: 'cloud-diagram', mode: 'current' };

const DIAGRAM_HEIGHT = 150;   // matches .cloud-diagram CSS height
const LAYER_HEIGHT = 18;      // matches .cloud-layer CSS height
const MAX_ALTITUDE_FT = 25000; // top of the diagram (covers high cirrus)

// Altitude bands used to color/label layers when the METAR has no genus type.
const ALTITUDE_BANDS = [
    { cls: 'cumulus', label: 'Low (<6,500ft)' },
    { cls: 'stratus', label: 'Mid (6,500–18,000ft)' },
    { cls: 'cirrus', label: 'High (>18,000ft)' },
    { cls: 'convective', label: 'Cumulonimbus (CB)' },
];

function altitudeClass(base) {
    const ft = base || 0;
    if (ft >= 18000) return 'cirrus';
    if (ft >= 6500) return 'stratus';
    return 'cumulus';
}

window.renderClouds = function(metarData, hourlyData, containerId = 'cloud-diagram') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Cloud container "${containerId}" not found.`);
        return;
    }

    _cloudState.metar = metarData || null;
    _cloudState.hourly = hourlyData || [];
    _cloudState.containerId = containerId;

    ensureToggle(container);
    drawClouds();
};

function ensureToggle(container) {
    // Insert a current/hourly toggle just above the diagram (once).
    if (document.getElementById('cloud-toggle')) return;

    const toggle = document.createElement('div');
    toggle.id = 'cloud-toggle';
    toggle.className = 'cloud-toggle';
    toggle.innerHTML =
        '<button type="button" data-mode="current" class="active">Current</button>' +
        '<button type="button" data-mode="hourly">Hourly</button>';

    toggle.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        _cloudState.mode = btn.getAttribute('data-mode');
        toggle.querySelectorAll('button').forEach(b =>
            b.classList.toggle('active', b === btn));
        drawClouds();
    });

    container.parentNode.insertBefore(toggle, container);
}

function drawClouds() {
    const container = document.getElementById(_cloudState.containerId);
    if (!container) return;

    container.innerHTML = '';
    const sourceEl = document.getElementById('cloud-source');
    const legendEl = document.getElementById('cloud-legend');
    if (legendEl) legendEl.innerHTML = '';

    if (_cloudState.mode === 'hourly') {
        drawHourly(container, sourceEl, legendEl);
    } else {
        drawCurrent(container, sourceEl, legendEl);
    }
}

/* ---- Current conditions: METAR layers, or single model cover bar ---- */
function drawCurrent(container, sourceEl, legendEl) {
    const metar = _cloudState.metar;
    const hasMetarClouds = metar && metar.clouds && metar.clouds.length > 0;

    if (hasMetarClouds) {
        if (sourceEl) sourceEl.textContent = 'METAR (observed)';
        const presentClasses = new Set();

        metar.clouds.forEach(cloud => {
            const layer = document.createElement('div');
            layer.className = 'cloud-layer';

            // Width by coverage amount.
            const coverFactor = COVER_FACTOR[cloud.cover] || 0.15;
            const widthPct = Math.max(coverFactor * 100, 15);
            layer.style.width = widthPct + '%';
            layer.style.left = ((100 - widthPct) / 2) + '%';

            // Vertical position by cloud base altitude.
            const base = cloud.base_ft_agl || 0;
            const altRatio = Math.min(base / MAX_ALTITUDE_FT, 1);
            layer.style.bottom = (altRatio * (DIAGRAM_HEIGHT - LAYER_HEIGHT)) + 'px';

            // Color by reported cloud type when known, else by altitude band.
            const typeClass = CLOUD_TYPE_CLASS[cloud.type] || altitudeClass(base);
            layer.classList.add(typeClass);
            presentClasses.add(typeClass);

            const label = document.createElement('div');
            label.className = 'label';
            const typeName = CLOUD_TYPE_NAMES[cloud.type] || cloud.type || '';
            const baseTxt = base ? ` · ${base.toLocaleString()}ft` : '';
            label.textContent = `${cloud.cover}${typeName ? ' ' + typeName : ''}${baseTxt}`;
            layer.appendChild(label);

            container.appendChild(layer);
        });

        if (legendEl) {
            ALTITUDE_BANDS.forEach(band => {
                if (!presentClasses.has(band.cls)) return;
                const item = document.createElement('span');
                item.className = 'cloud-legend-item';
                item.innerHTML =
                    `<span class="cloud-legend-color ${band.cls}"></span> ${band.label}`;
                legendEl.appendChild(item);
            });
        }
        return;
    }

    // Fallback: single bar for the current hour's total model cloud cover.
    const cover = currentHourCloudCover(_cloudState.hourly);
    if (cover === null) {
        if (sourceEl) sourceEl.textContent = 'No cloud data';
        const empty = document.createElement('div');
        empty.className = 'cloud-empty';
        empty.textContent = 'No cloud data available';
        container.appendChild(empty);
        return;
    }

    if (sourceEl) sourceEl.textContent = 'Model (current hour)';

    const bar = document.createElement('div');
    bar.className = 'cloud-layer ' + coverClass(cover);
    const widthPct = Math.max(cover, 12);
    bar.style.width = widthPct + '%';
    bar.style.left = ((100 - widthPct) / 2) + '%';
    bar.style.height = '46px';
    bar.style.bottom = ((DIAGRAM_HEIGHT - 46) / 2) + 'px';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `${Math.round(cover)}% cloud cover`;
    bar.appendChild(label);
    container.appendChild(bar);

    if (legendEl) {
        const item = document.createElement('span');
        item.className = 'cloud-legend-item';
        item.innerHTML = `<span class="cloud-legend-color ${coverClass(cover)}"></span> Model cloud cover`;
        legendEl.appendChild(item);
    }
}

/* ---- Hourly model cloud cover as a simple bar chart ---- */
function drawHourly(container, sourceEl, legendEl) {
    const hourly = _cloudState.hourly || [];
    const points = hourly.filter(h => h.cloud_cover != null);

    if (points.length === 0) {
        if (sourceEl) sourceEl.textContent = 'No cloud data';
        const empty = document.createElement('div');
        empty.className = 'cloud-empty';
        empty.textContent = 'No hourly cloud data available';
        container.appendChild(empty);
        return;
    }

    if (sourceEl) sourceEl.textContent = 'Model (hourly)';

    const chart = document.createElement('div');
    chart.className = 'cloud-hourly';

    points.forEach(h => {
        const col = document.createElement('div');
        col.className = 'cloud-hour-col';

        const bar = document.createElement('div');
        bar.className = 'cloud-hour-bar ' + coverClass(h.cloud_cover);
        bar.style.height = Math.max(h.cloud_cover, 2) + '%';
        bar.title = `${h.hour || ''} — ${Math.round(h.cloud_cover)}%`;
        col.appendChild(bar);

        // Label every 3rd hour to avoid crowding.
        const hh = (h.hour || '').slice(0, 2);
        const tick = document.createElement('div');
        tick.className = 'cloud-hour-tick';
        tick.textContent = (hh && parseInt(hh, 10) % 3 === 0) ? hh : '';
        col.appendChild(tick);

        chart.appendChild(col);
    });

    container.appendChild(chart);

    if (legendEl) {
        legendEl.innerHTML =
            '<span class="cloud-legend-item"><span class="cloud-legend-color cirrus"></span> Light</span>' +
            '<span class="cloud-legend-item"><span class="cloud-legend-color stratus"></span> Moderate</span>' +
            '<span class="cloud-legend-item"><span class="cloud-legend-color nimbus"></span> Overcast</span>';
    }
}

/* ---- helpers ---- */
function currentHourCloudCover(hourly) {
    if (!hourly || hourly.length === 0) return null;
    const nowHH = String(new Date().getHours()).padStart(2, '0');
    const match = hourly.find(h => (h.hour || '').slice(0, 2) === nowHH && h.cloud_cover != null);
    if (match) return match.cloud_cover;
    const first = hourly.find(h => h.cloud_cover != null);
    return first ? first.cloud_cover : null;
}

function coverClass(cover) {
    if (cover < 30) return 'cirrus';
    if (cover < 75) return 'stratus';
    return 'nimbus';
}
