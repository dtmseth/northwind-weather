
window.renderDroneView = function(hourlyData, droneModel = 'mid') {
    // Mock droneLimits function as specified in the requirements.
    // In a real application, this would be imported from utils.js.
    function droneLimits(model) {
        switch (model) {
            case 'mini':
                return { sustained: 10.7, gust: 15 }; // m/s
            case 'mid':
                return { sustained: 12, gust: 17 }; // m/s
            case 'pro':
                return { sustained: 15, gust: 20 }; // m/s
            default:
                return { sustained: 12, gust: 17 }; // Default to 'mid'
        }
    }

    const MS_TO_MPH = 2.237;

    let maxSustainedWind = 0;
    let maxGustWind = 0;

    // Find max sustained and gust wind speeds from hourlyData
    // Assuming hourlyData entries have 'wind_speed_ms' and 'wind_gust_ms'
    // For simplicity, we are considering all hourlyData for max wind,
    // as "golden hour windows and daylight hours" require more context (e.g., sunrise/sunset times)
    // than available in the prompt or typical hourly weather data without location/date.
    if (hourlyData && hourlyData.length > 0) {
        hourlyData.forEach(hour => {
            if (hour.wind_speed_ms > maxSustainedWind) {
                maxSustainedWind = hour.wind_speed_ms;
            }
            if (hour.wind_gust_ms > maxGustWind) {
                maxGustWind = hour.wind_gust_ms;
            }
        });
    }

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
        score = 10 - Math.min(Math.floor(sustainedPercentage / 10), Math.floor(gustPercentage / 10)); // Higher percentage = lower score
        if (score < 7) score = 7; // Min score for green
        colorClass = "green";
        if (maxSustainedWind < 3) {
            tips.push("Reflection shots possible. Very calm!");
        } else {
            tips.push("Great conditions for all drone activities.");
        }
        if (maxGustWind < maxSustainedWind * 1.2) { // Relatively stable winds
            tips.push("Winds are stable, good for timelapses.");
        }
    } else if (sustainedPercentage <= 85 || gustPercentage <= 90) {
        flyabilityStatus = "Flyable, bumpy";
        score = 6 - Math.floor(Math.max(sustainedPercentage, gustPercentage) / 10 - 6); // Score between 3-6
        if (score < 3) score = 3; // Min score for yellow
        colorClass = "yellow";
        tips.push("Expect some turbulence. Fly with caution.");
        if (gustPercentage > sustainedPercentage * 1.5) {
            tips.push("Gusty conditions! Watch for sudden drone movements.");
        }
    } else {
        flyabilityStatus = "Ground your drone";
        score = Math.floor(Math.random() * 2) + 1; // Score 1 or 2 for red
        colorClass = "red";
        tips.push("Winds are too strong. Flying is not recommended.");
    }

    // Ensure score is within 0-10 range
    score = Math.max(0, Math.min(10, score));

    // Update DOM elements
    const droneScoreDisplay = document.querySelector('#drone-score-display');
    if (droneScoreDisplay) {
        droneScoreDisplay.textContent = score.toFixed(0);
        droneScoreDisplay.className = ''; // Clear existing classes
        droneScoreDisplay.classList.add(colorClass);
    }

    const gaugeValue = document.querySelector('#gauge-value');
    if (gaugeValue) {
        gaugeValue.textContent = score.toFixed(0);
    }

    const droneGauge = document.querySelector('#drone-gauge');
    if (droneGauge) {
        droneGauge.className = 'drone-gauge'; // Reset to base class
        droneGauge.classList.add(colorClass);
    }

    const droneWind = document.querySelector('#drone-wind');
    if (droneWind) {
        droneWind.innerHTML = `Sustained: ${maxSustainedWind.toFixed(1)} m/s (${(maxSustainedWind * MS_TO_MPH).toFixed(1)} mph)`;
    }

    const droneGusts = document.querySelector('#drone-gusts');
    if (droneGusts) {
        droneGusts.innerHTML = `Gusts: ${maxGustWind.toFixed(1)} m/s (${(maxGustWind * MS_TO_MPH).toFixed(1)} mph)`;
    }

    const droneLimit = document.querySelector('#drone-limit');
    if (droneLimit) {
        droneLimit.innerHTML = `Model Limit: ${limits.sustained.toFixed(1)} m/s`;
    }

    const droneTips = document.querySelector('#drone-tips');
    if (droneTips) {
        droneTips.innerHTML = tips.map(tip => `<p>${tip}</p>`).join('');
        if (tips.length === 0) {
            droneTips.innerHTML = "<p>No specific tips for current conditions.</p>";
        }
    }

    // Sync dropdowns
    const droneSelect = document.querySelector('#drone-select');
    if (droneSelect) {
        droneSelect.value = droneModel;
    }
    const droneSelectLarge = document.querySelector('#drone-select-large');
    if (droneSelectLarge) {
        droneSelectLarge.value = droneModel;
    }
};
