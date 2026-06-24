/* Northwind Weather — Slim golden hour bar (replaces verbose timeline) */

window.renderTimeline = function(sunData, hourlyData) {
    var bar = document.getElementById('timeline-bar');
    var labels = document.getElementById('timeline-labels');
    var details = document.getElementById('timeline-details');
    if (!bar) return;

    var sunrise = sunData.sunrise;
    var sunset = sunData.sunset;
    var ghAmStart = sunData.golden_hour_am_start;
    var ghAmEnd = sunData.golden_hour_am_end;
    var ghPmStart = sunData.golden_hour_pm_start;
    var ghPmEnd = sunData.golden_hour_pm_end;
    var bhAmStart = sunData.blue_hour_am_start;
    var bhAmEnd = sunData.blue_hour_am_end;
    var bhPmStart = sunData.blue_hour_pm_start;
    var bhPmEnd = sunData.blue_hour_pm_end;

    if (!sunrise || !sunset) {
        bar.innerHTML = '<div style="padding:4px;text-align:center;color:var(--text-muted);font-size:12px">Sun data unavailable</div>';
        return;
    }

    // Convert ISO times to minutes-from-midnight (local)
    function toMin(iso) {
        if (!iso) return null;
        var d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
    }

    var sr = toMin(sunrise);
    var ss = toMin(sunset);
    var ghas = toMin(ghAmStart) || sr - 30;
    var ghae = toMin(ghAmEnd) || sr;
    var ghps = toMin(ghPmStart) || ss;
    var ghpe = toMin(ghPmEnd) || ss + 30;
    var bhas = toMin(bhAmStart) || ghas - 30;
    var bhae = toMin(bhAmEnd) || ghas;
    var bhps = toMin(bhPmStart) || ghpe;
    var bhpe = toMin(bhPmEnd) || ghpe + 30;

    // Build gradient stops (percentages of 24h = 1440 min)
    var TOTAL = 1440;
    function pct(min) { return (min / TOTAL * 100).toFixed(1); }

    // Build the gradient string
    var stops = [];
    // Night until blue hour AM
    stops.push('#0a0a2e 0%');
    stops.push('#0a0a2e ' + pct(bhas) + '%');
    // Blue hour AM
    stops.push('#1a1a5e ' + pct(bhas) + '%');
    stops.push('#1a1a5e ' + pct(bhae) + '%');
    // Golden hour AM
    stops.push('#ffd700 ' + pct(bhae) + '%');
    stops.push('#ffd700 ' + pct(ghae) + '%');
    // Day
    stops.push('#87CEEB ' + pct(ghae) + '%');
    stops.push('#87CEEB ' + pct(ghps) + '%');
    // Golden hour PM
    stops.push('#ffd700 ' + pct(ghps) + '%');
    stops.push('#ffd700 ' + pct(ghpe) + '%');
    // Blue hour PM
    stops.push('#1a1a5e ' + pct(ghpe) + '%');
    stops.push('#1a1a5e ' + pct(bhpe) + '%');
    // Night
    stops.push('#0a0a2e ' + pct(bhpe) + '%');
    stops.push('#0a0a2e 100%');

    bar.style.background = 'linear-gradient(to right, ' + stops.join(', ') + ')';

    // Now marker
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var nowPct = (nowMin / TOTAL * 100).toFixed(1);
    bar.innerHTML = '<div class="now-marker" style="position:absolute;top:0;bottom:0;width:2px;background:#ff4444;z-index:2;left:' + nowPct + '%"></div>';

    // Labels: sunrise left, sunset right
    if (labels) {
        labels.innerHTML =
            '<span>' + formatTime(sunrise) + '</span>' +
            '<span>' + formatTime(sunset) + '</span>';
    }

    // Details: single line with golden hour times
    if (details) {
        details.style.display = 'block';
        details.style.cssText = 'text-align:center;padding:8px;font-size:13px;color:var(--text-secondary);';
        details.innerHTML =
            '<span style="color:#ffd700">Golden hour:</span> ' +
            formatTime(ghAmStart) + ' - ' + formatTime(ghAmEnd) +
            ' &nbsp;|&nbsp; ' +
            formatTime(ghPmStart) + ' - ' + formatTime(ghPmEnd) +
            ' &nbsp; ' +
            '<span style="color:#4169e1">Blue hour:</span> ' +
            formatTime(bhAmStart) + ' - ' + formatTime(bhAmEnd) +
            ' &nbsp;|&nbsp; ' +
            formatTime(bhPmStart) + ' - ' + formatTime(bhPmEnd);
    }
};
