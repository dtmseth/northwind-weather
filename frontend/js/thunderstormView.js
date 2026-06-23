/* Northwind Weather — Thunderstorm detection + photography alerts */

window.renderThunderstormView = function(dailyEntry) {
    const stormDisplay = document.getElementById('storm-display');
    const scoreEl = document.getElementById('storm-score');
    const detailEl = document.getElementById('storm-detail');

    const stormData = dailyEntry && dailyEntry.storm_photo;
    if (!stormData || !stormData.score || stormData.score === 0) {
        scoreEl.textContent = '--';
        scoreEl.className = 'storm-score low';
        detailEl.textContent = 'No storms forecast. Clear skies ahead.';
        return;
    }

    const score = stormData.score;
    const type = stormData.type || 'none';
    const hour = stormData.hour || '';

    scoreEl.textContent = score;

    let detailText = '';
    let scoreClass = 'low';

    if (score >= 9) {
        scoreClass = 'high';
        if (type === 'isolated_storm_clear_breaks') {
            detailText = `⚡ Isolated storms near clear sky ${hour ? 'at ' + hour : ''}! Incredible photo potential — golden light on storm clouds.`;
        } else if (type === 'unstable_air_clear_breaks') {
            detailText = `🌤️ Unstable air mass with breaks in clouds ${hour ? 'around ' + hour : ''}! Watch for mammatus clouds and dramatic formations.`;
        } else {
            detailText = `⚡ Storm potential — check conditions near ${hour || 'golden hour'}.`;
        }
    } else if (score >= 6) {
        scoreClass = 'medium';
        if (type === 'widespread_storm') {
            detailText = `🌩️ Widespread storms likely ${hour ? 'at ' + hour : ''}. Dramatic sky but limited golden light. Stay safe, consider sheltered location.`;
        } else {
            detailText = `⛈️ Some storm activity possible. Keep an eye on the sky — could create interesting conditions.`;
        }
    } else {
        if (type === 'unstable_air_clear_breaks') {
            detailText = `🌤️ Slightly unstable air. Possibility of some interesting cloud formations.`;
        } else {
            detailText = `⛅ Marginal storm interest. Check back closer to the day for updates.`;
        }
    }

    scoreEl.className = 'storm-score ' + scoreClass;
    detailEl.textContent = detailText;

    // Safety check
    if (score >= 8) {
        const safetyNote = document.createElement('div');
        safetyNote.className = 'storm-safety';
        safetyNote.textContent = '🛑 Caution: golden hour + storms = dramatic light, but dangerous in open areas. Stay aware of lightning risk.';
        safetyNote.style.cssText = 'margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(255,68,68,0.1);color:#ff6666;font-size:12px;';
        const existing = stormDisplay.querySelector('.storm-safety');
        if (existing) existing.remove();
        stormDisplay.appendChild(safetyNote);
    } else {
        const existing = stormDisplay.querySelector('.storm-safety');
        if (existing) existing.remove();
    }
};
