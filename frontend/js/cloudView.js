
// Assume these are imported or defined globally from utils.js
const COVER_FACTOR = {
    "FEW": 0.2,
    "SCT": 0.4,
    "BKN": 0.7,
    "OVC": 1.0,
    "VV": 1.0 // Vertical visibility, often treated as overcast for cloud rendering
};

const CLOUD_TYPE_NAMES = {
    "CU": "Cumulus",
    "TCU": "Towering Cumulus",
    "SC": "Stratocumulus",
    "ST": "Stratus",
    "CI": "Cirrus",
    "CS": "Cirrostratus",
    "CC": "Cirrocumulus",
    "NS": "Nimbostratus",
    "CB": "Cumulonimbus",
    "VV": "Vertical Visibility" // For low visibility, not a cloud type but included for completeness
};

const CLOUD_TYPE_CLASS = {
    "CU": "cumulus",
    "TCU": "convective", // Often shown as convective
    "SC": "stratus",
    "ST": "stratus",
    "CI": "cirrus",
    "CS": "cirrus",
    "CC": "cirrus",
    "NS": "nimbus",
    "CB": "convective",
    "VV": "nimbus" // A proxy for very low visibility/overcast
};

window.renderClouds = function(metarData, hourlyData, containerId = "cloud-diagram") {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element with ID "${containerId}" not found.`);
        return;
    }

    container.innerHTML = ''; // Clear previous content
    const cloudSourceElement = document.getElementById('cloud-source');
    const cloudLegendElement = document.getElementById('cloud-legend');

    if (cloudSourceElement) cloudSourceElement.textContent = '';
    if (cloudLegendElement) cloudLegendElement.innerHTML = '';

    const diagramHeight = container.clientHeight; // Should be 100px based on requirements
    const MAX_ALTITUDE_FT = 15000; // 100% of height for 15000ft+

    if (metarData && metarData.clouds && metarData.clouds.length > 0) {
        if (cloudSourceElement) cloudSourceElement.textContent = 'Data Source: METAR';

        const presentCloudTypes = new Set();

        metarData.clouds.forEach(cloud => {
            const cloudLayerDiv = document.createElement('div');
            cloudLayerDiv.classList.add('cloud-layer');

            // Set height based on coverage
            const coverageFactor = COVER_FACTOR[cloud.cover] || 0.1; // Default to small if unknown
            cloudLayerDiv.style.width = `${coverageFactor * 100}%`;

            // Set bottom offset based on base_ft_agl
            const altitudeRatio = Math.min(cloud.base_ft_agl / MAX_ALTITUDE_FT, 1);
            cloudLayerDiv.style.bottom = `${altitudeRatio * (diagramHeight - 10)}px`; // -10 to leave some space at the top for higher clouds

            // Apply cloud type class for coloring
            const cloudTypeClass = CLOUD_TYPE_CLASS[cloud.type] || '';
            if (cloudTypeClass) {
                cloudLayerDiv.classList.add(cloudTypeClass);
                presentCloudTypes.add(cloud.type);
            }

            // Add label
            const labelDiv = document.createElement('div');
            labelDiv.classList.add('label');
            const typeName = CLOUD_TYPE_NAMES[cloud.type] || cloud.type;
            labelDiv.textContent = `${cloud.cover} ${typeName} (${cloud.base_ft_agl}ft)`;
            cloudLayerDiv.appendChild(labelDiv);

            container.appendChild(cloudLayerDiv);
        });

        // Update cloud legend
        if (cloudLegendElement) {
            presentCloudTypes.forEach(type => {
                const legendItem = document.createElement('span');
                legendItem.classList.add('cloud-legend-item');
                legendItem.innerHTML = `<span class="cloud-legend-color ${CLOUD_TYPE_CLASS[type]}"></span> ${CLOUD_TYPE_NAMES[type] || type}`;
                cloudLegendElement.appendChild(legendItem);
            });
        }

    } else if (hourlyData && hourlyData.length > 0) {
        if (cloudSourceElement) cloudSourceElement.textContent = 'Data Source: Model (Hourly)';

        // Calculate average cloud cover
        const totalCloudCover = hourlyData.reduce((sum, entry) => sum + (entry.cloud_cover || 0), 0);
        const averageCloudCover = hourlyData.length > 0 ? totalCloudCover / hourlyData.length : 0;

        const modelCloudDiv = document.createElement('div');
        modelCloudDiv.classList.add('cloud-layer');
        modelCloudDiv.classList.add('stratus'); // Default to stratus for model cover, or a generic 'model-cloud' class
        modelCloudDiv.style.width = `${averageCloudCover}%`;
        modelCloudDiv.style.height = '50%'; // Take up half the height for a single bar
        modelCloudDiv.style.bottom = '0'; // Position at the bottom

        const labelDiv = document.createElement('div');
        labelDiv.classList.add('label');
        labelDiv.textContent = `Model: ${Math.round(averageCloudCover)}% coverage`;
        modelCloudDiv.appendChild(labelDiv);

        container.appendChild(modelCloudDiv);

        if (cloudLegendElement) {
            const legendItem = document.createElement('span');
            legendItem.classList.add('cloud-legend-item');
            legendItem.innerHTML = `<span class="cloud-legend-color stratus"></span> Model Cloud Cover`;
            cloudLegendElement.appendChild(legendItem);
        }

    } else {
        if (cloudSourceElement) cloudSourceElement.textContent = 'No cloud data available.';
    }
};
