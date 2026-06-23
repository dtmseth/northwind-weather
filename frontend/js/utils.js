/* Northwind Weather — Utility helpers */

function formatTime(isoStr) {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTimeShort(isoStr) {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(isoStr) {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function hourFromIso(isoStr) {
    if (!isoStr) return '';
    return isoStr.length >= 13 ? isoStr.slice(11, 16) : isoStr;
}

function parseHour(isoStr) {
    if (!isoStr) return 0;
    const h = isoStr.length >= 13 ? parseInt(isoStr.slice(11, 13)) : parseInt(isoStr.slice(0, 2));
    return isNaN(h) ? 0 : h;
}

function timeToFraction(isoStr) {
    if (!isoStr) return 0;
    const d = new Date(isoStr);
    return (d.getHours() * 60 + d.getMinutes()) / 1440;
}

function nowFraction() {
    const d = new Date();
    return (d.getHours() * 60 + d.getMinutes()) / 1440;
}

function durationMinutes(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.round((e - s) / 60000);
}

function getTimeForProgress(isoStr) {
    if (!isoStr) return 0;
    const d = new Date(isoStr);
    return d.getHours() * 60 + d.getMinutes();
}

function msToTime(ms) {
    const totalMinutes = Math.round(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
}

const CLOUD_TYPE_NAMES = {
    'CU': 'Cumulus', 'SC': 'Stratocumulus', 'AC': 'Altocumulus',
    'AS': 'Altostratus', 'NS': 'Nimbostratus', 'CB': 'Cumulonimbus',
    'TCU': 'Towering Cumulus', 'ST': 'Stratus', 'CI': 'Cirrus',
    'CS': 'Cirrostratus', 'CC': 'Cirrocumulus',
};

const CLOUD_TYPE_CLASS = {
    'CU': 'cumulus', 'TCU': 'cumulus', 'SC': 'stratus',
    'ST': 'stratus', 'NS': 'nimbus', 'CB': 'convective',
    'AC': 'cumulus', 'AS': 'stratus', 'CI': 'cirrus',
    'CS': 'cirrus', 'CC': 'cirrus',
};

const COVER_FACTOR = { 'FEW': 0.2, 'SCT': 0.4, 'BKN': 0.7, 'OVC': 1.0, 'VV': 1.0 };

const MOON_ICONS = {
    'New Moon': '🌑', 'Waxing Crescent': '🌒', 'First Quarter': '🌓',
    'Waxing Gibbous': '🌔', 'Full Moon': '🌕', 'Waning Gibbous': '🌖',
    'Third Quarter': '🌗', 'Waning Crescent': '🌘',
};

function droneLimits(model) {
    switch (model) {
        case 'mini': return { sustained: 10.7, gust: 15 };
        case 'mid': return { sustained: 12, gust: 17 };
        case 'pro': return { sustained: 15, gust: 20 };
        default: return { sustained: 12, gust: 17 };
    }
}
