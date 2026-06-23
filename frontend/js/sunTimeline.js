
window.renderTimeline = function(sunData, hourlyData) {
    // Guard: SunCalc may not be loaded
    if (typeof SunCalc === 'undefined') {
        document.getElementById('timeline-bar').innerHTML =
            '<div style="padding:8px;text-align:center;color:var(--text-muted);font-size:12px">Timeline unavailable offline</div>';
        return;
    }
    const timelineBar = document.getElementById('timeline-bar');
    const timelineLabels = document.getElementById('timeline-labels');
    const timelineDetails = document.getElementById('timeline-details');

    if (!timelineBar || !timelineLabels || !timelineDetails) {
        console.error('One or more timeline elements not found.');
        return;
    }

    // Clear previous content
    timelineLabels.innerHTML = '';
    timelineDetails.innerHTML = '';

    // --- Render Timeline Bar ---
    const segments = [];

    // Night (default background, but can be explicitly defined for clarity)
    // We'll calculate night dynamically around other segments.
    // For now, focus on specific periods and fill night in between.

    // Blue Hour AM
    if (sunData.blueHour_am_start && sunData.blueHour_am_end) {
        segments.push({
            start: timeToFraction(new Date(sunData.blueHour_am_start)),
            end: timeToFraction(new Date(sunData.blueHour_am_end)),
            color: 'var(--color-blue-hour-deep)'
        });
    }

    // Golden Hour AM
    if (sunData.goldenHour_am_start && sunData.goldenHour_am_end) {
        segments.push({
            start: timeToFraction(new Date(sunData.goldenHour_am_start)),
            end: timeToFraction(new Date(sunData.goldenHour_am_end)),
            color: 'var(--color-golden-hour)'
        });
    }

    // Day
    if (sunData.sunrise && sunData.sunset) {
        segments.push({
            start: timeToFraction(new Date(sunData.sunrise)),
            end: timeToFraction(new Date(sunData.sunset)),
            color: 'var(--color-day-light)'
        });
    }

    // Golden Hour PM
    if (sunData.goldenHour_pm_start && sunData.goldenHour_pm_end) {
        segments.push({
            start: timeToFraction(new Date(sunData.goldenHour_pm_start)),
            end: timeToFraction(new Date(sunData.goldenHour_pm_end)),
            color: 'var(--color-golden-hour)'
        });
    }

    // Blue Hour PM
    if (sunData.blueHour_pm_start && sunData.blueHour_pm_end) {
        segments.push({
            start: timeToFraction(new Date(sunData.blueHour_pm_start)),
            end: timeToFraction(new Date(sunData.blueHour_pm_end)),
            color: 'var(--color-blue-hour-deep)'
        });
    }

    // Sort segments by start time
    segments.sort((a, b) => a.start - b.start);

    // Build the linear-gradient string
    let gradientString = 'linear-gradient(to right, ';
    let currentTimeFraction = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Add night before the current segment if there's a gap
        if (segment.start > currentTimeFraction) {
            gradientString += `var(--color-night-dark) ${currentTimeFraction * 100}%, var(--color-night-dark) ${segment.start * 100}%, `;
        }

        // Add the current segment
        gradientString += `${segment.color} ${segment.start * 100}%, ${segment.color} ${segment.end * 100}%`;
        currentTimeFraction = segment.end;

        if (i < segments.length - 1) {
            gradientString += ', ';
        }
    }

    // Add night after the last segment if it doesn't extend to 1.0 (end of day)
    if (currentTimeFraction < 1) {
        if (segments.length > 0) {
            gradientString += ', ';
        }
        gradientString += `var(--color-night-dark) ${currentTimeFraction * 100}%, var(--color-night-dark) 100%`;
    }

    gradientString += ')';
    timelineBar.style.background = gradientString;
    timelineBar.classList.add('timeline-bar'); // Ensure the height is applied

    // --- Add "Now" Marker ---
    const nowFrac = nowFraction();
    const nowMarker = document.createElement('div');
    nowMarker.classList.add('timeline-now-marker');
    nowMarker.style.left = `${nowFrac * 100}%`;
    timelineBar.appendChild(nowMarker);

    // --- Render Time Labels ---
    const keyTimes = [];
    if (sunData.sunrise) keyTimes.push({ time: new Date(sunData.sunrise), label: 'Sunrise' });
    if (sunData.solar_noon) keyTimes.push({ time: new Date(sunData.solar_noon), label: 'Solar Noon' });
    if (sunData.sunset) keyTimes.push({ time: new Date(sunData.sunset), label: 'Sunset' });
    if (sunData.goldenHour_am_start) keyTimes.push({ time: new Date(sunData.goldenHour_am_start), label: 'GH AM Start' });
    if (sunData.goldenHour_am_end) keyTimes.push({ time: new Date(sunData.goldenHour_am_end), label: 'GH AM End' });
    if (sunData.goldenHour_pm_start) keyTimes.push({ time: new Date(sunData.goldenHour_pm_start), label: 'GH PM Start' });
    if (sunData.goldenHour_pm_end) keyTimes.push({ time: new Date(sunData.goldenHour_pm_end), label: 'GH PM End' });
    if (sunData.blueHour_am_start) keyTimes.push({ time: new Date(sunData.blueHour_am_start), label: 'BH AM Start' });
    if (sunData.blueHour_am_end) keyTimes.push({ time: new Date(sunData.blueHour_am_end), label: 'BH AM End' });
    if (sunData.blueHour_pm_start) keyTimes.push({ time: new Date(sunData.blueHour_pm_start), label: 'BH PM Start' });
    if (sunData.blueHour_pm_end) keyTimes.push({ time: new Date(sunData.blueHour_pm_end), label: 'BH PM End' });

    keyTimes.sort((a, b) => a.time.getTime() - b.time.getTime());

    keyTimes.forEach(kt => {
        const timeFrac = timeToFraction(kt.time);
        const labelDiv = document.createElement('div');
        labelDiv.classList.add('timeline-label');
        labelDiv.style.left = `${timeFrac * 100}%`;
        labelDiv.innerHTML = `<span class="time">${formatTime(kt.time)}</span><span class="event">${kt.label.replace(' Start', '').replace(' End', '')}</span>`;
        timelineLabels.appendChild(labelDiv);
    });

    // --- Render Details Grid ---
    const detailsData = [
        { label: 'Morning Golden Hour', start: sunData.goldenHour_am_start, end: sunData.goldenHour_am_end, cssClass: 'golden-hour-details' },
        { label: 'Morning Blue Hour', start: sunData.blueHour_am_start, end: sunData.blueHour_am_end, cssClass: 'blue-hour-details' },
        { label: 'Evening Golden Hour', start: sunData.goldenHour_pm_start, end: sunData.goldenHour_pm_end, cssClass: 'golden-hour-details' },
        { label: 'Evening Blue Hour', start: sunData.blueHour_pm_start, end: sunData.blueHour_pm_end, cssClass: 'blue-hour-details' }
    ];

    detailsData.forEach(detail => {
        const start = detail.start ? new Date(detail.start) : null;
        const end = detail.end ? new Date(detail.end) : null;
        const duration = (start && end) ? durationMinutes(start, end) : 'N/A';

        const detailBox = document.createElement('div');
        detailBox.classList.add('timeline-detail-box', detail.cssClass);
        detailBox.innerHTML = `
            <h3>${detail.label}</h3>
            <p>Start: ${start ? formatTime(start) : 'N/A'}</p>
            <p>End: ${end ? formatTime(end) : 'N/A'}</p>
            <p>Duration: ${duration} min</p>
        `;
        timelineDetails.appendChild(detailBox);
    });
};
