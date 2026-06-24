
window.renderDroneView = function(hourlyData, droneModel = 'mid', metar = null) {
    function droneLimits(model) {
        switch (model) {
            case 'mini': return { sustained: 10.7, gust: 15 };
            case 'mini-pro': return { sustained: 10.7, gust: 15 };
            case 'mid': return { sustained: 12, gust: 17 };
            case 'pro': return { sustained: 15, gust: 20 };
            case 'fpv': return { sustained: 8.9, gust: 13.4 };
            default: return { sustained: 12, gust: 17 };
        }
    }

    const MS_TO_MPH = 2.237;
    const KT_TO_MS = 0.514444;

    // Model wind: max sustained + gust over the day (m/s — backend requests m/s)
    let modelSustained = 0;
    let modelGust = 0;
    if (hourlyData && hourlyData.length > 0) {
        hourlyData.forEach(hour => {
            if (hour.wind_speed_10m > modelSustained) modelSustained = hour.wind_speed_10m;
            if (hour.wind_gusts_10m > modelGust) modelGust = hour.wind_gusts_10m;
        });
    }

    // METAR wind (actual airport observation) takes priority when available.
    let obsSustained = null;
    let obsGust = null;
    let metarStation = null;
    if (metar && metar.wind && metar.wind.speed_kt != null) {
        obsSustained = metar.wind.speed_kt * KT_TO_MS;
        obsGust = (metar.wind.gust_kt != null ? metar.wind.gust_kt : metar.wind.speed_kt) * KT_TO_MS;
        metarStation = metar.station || null;
    }

    const usingMetar = obsSustained !== null;
    // Primary values drive the flyability gauge.
    const maxSustainedWind = usingMetar ? obsSustained : modelSustained;
    const maxGustWind = usingMetar ? obsGust : modelGust;

    const limits = droneLimits(droneModel);
    const sustainedPercentage = (maxSustainedWind / limits.sustained) * 100;
    const gustPercentage = (maxGustWind / limits.gust) * 100;

    let flyabilityStatus = "Unknown";
    let score = 0; // 0-10, 10 being best
    let colorClass = "";
    let tips = [];

    // Flyability scoring
    if (sustainedPercentage <= 60 && gustPercentage <= 70) {
        flyabilityStatus = "Good to fly";
        score = 10 - Math.min(Math.floor(sustainedPercentage / 10), Math.floor(gustPercentage / 10));
        if (score < 7) score = 7;
        colorClass = "green";
        if (maxSustainedWind < 3) {
            tips.push("Reflection shots possible. Very calm!");
        } else {
            tips.push("Great conditions for all drone activities.");
        }
        if (maxGustWind < maxSustainedWind * 1.2) {
            tips.push("Winds are stable, good for timelapses.");
        }
    } else if (sustainedPercentage <= 85 || gustPercentage <= 90) {
        flyabilityStatus = "Flyable, bumpy";
        score = 6 - Math.floor(Math.max(sustainedPercentage, gustPercentage) / 10 - 6);
        if (score < 3) score = 3;
        colorClass = "yellow";
        tips.push("Expect some turbulence. Fly with caution.");
        if (gustPercentage > sustainedPercentage * 1.5) {
            tips.push("Gusty conditions! Watch for sudden drone movements.");
        }
    } else {
        flyabilityStatus = "Ground your drone";
        score = 2;
        colorClass = "red";
        tips.push("Winds are too strong. Flying is not recommended.");
    }

    score = Math.max(0, Math.min(10, score));

    // Update DOM elements
    const droneScoreDisplay = document.querySelector('#drone-score-display');
    if (droneScoreDisplay) {
        droneScoreDisplay.textContent = score.toFixed(0);
        droneScoreDisplay.className = '';
        droneScoreDisplay.classList.add(colorClass);
    }

    const gaugeValue = document.querySelector('#gauge-value');
    if (gaugeValue) {
        gaugeValue.textContent = score.toFixed(0);
    }

    const droneGauge = document.querySelector('#drone-gauge');
    if (droneGauge) {
        droneGauge.className = 'drone-gauge';
        droneGauge.classList.add(colorClass);
    }

    const sourceTag = usingMetar
        ? ` <span class="wind-source">obs ${metarStation || 'METAR'}</span>`
        : ` <span class="wind-source">model</span>`;

    const droneWind = document.querySelector('#drone-wind');
    if (droneWind) {
        droneWind.innerHTML =
            `${maxSustainedWind.toFixed(1)} m/s (${(maxSustainedWind * MS_TO_MPH).toFixed(1)} mph)${sourceTag}`;
    }

    const droneGusts = document.querySelector('#drone-gusts');
    if (droneGusts) {
        droneGusts.innerHTML =
            `${maxGustWind.toFixed(1)} m/s (${(maxGustWind * MS_TO_MPH).toFixed(1)} mph)${sourceTag}`;
    }

    const droneLimit = document.querySelector('#drone-limit');
    if (droneLimit) {
        droneLimit.innerHTML = `${limits.sustained.toFixed(1)} m/s sustained`;
    }

    // When showing live METAR obs, also surface the model's forecast peak for the day.
    if (usingMetar && (modelSustained > 0 || modelGust > 0)) {
        tips.push(
            `Model forecast peak today: ${modelSustained.toFixed(1)} m/s ` +
            `(${(modelSustained * MS_TO_MPH).toFixed(0)} mph), gusts ${modelGust.toFixed(1)} m/s.`
        );
    }

    const droneTips = document.querySelector('#drone-tips');
    if (droneTips) {
        if (tips.length === 0) {
            droneTips.innerHTML = "<p>No specific tips for current conditions.</p>";
        } else {
            droneTips.innerHTML = tips.map(tip => `<p>${tip}</p>`).join('');
        }
    }

    // Sync dropdowns
    const droneSelect = document.querySelector('#drone-select');
    if (droneSelect) droneSelect.value = droneModel;
    const droneSelectLarge = document.querySelector('#drone-select-large');
    if (droneSelectLarge) droneSelectLarge.value = droneModel;
};
