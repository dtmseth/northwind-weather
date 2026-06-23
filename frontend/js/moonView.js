/* Northwind Weather — Moon phase tracker */

window.renderMoonView = function(sunData) {
    const moon = sunData && sunData.moon;
    if (!moon) {
        document.getElementById('moon-phase').textContent = '--';
        document.getElementById('moon-illum').textContent = '--';
        document.getElementById('moonrise').textContent = '--';
        document.getElementById('moonset').textContent = '--';
        return;
    }

    const phaseName = moon.phase || 'Unknown';
    const icon = MOON_ICONS[phaseName] || '🌙';
    const illum = moon.illumination !== undefined ? moon.illumination + '%' : '--';
    const rise = formatTime(moon.rise);
    const set = formatTime(moon.set);

    document.getElementById('moon-icon').textContent = icon;
    document.getElementById('moon-phase').textContent = phaseName;
    document.getElementById('moon-illum').textContent = `Illumination: ${illum}`;
    document.getElementById('moonrise').textContent = rise;
    document.getElementById('moonset').textContent = set;

    // Photography note
    const note = document.getElementById('moon-note');
    let noteText = '';

    // Check if moon rise/set overlaps golden hour
    const ghAm = sunData && sunData.golden_hour_am_start;
    const ghPm = sunData && sunData.golden_hour_pm_end;

    if (moon.rise && ghAm) {
        const riseH = parseHour(moon.rise);
        const ghStartH = parseHour(ghAm);
        if (Math.abs(riseH - ghStartH) <= 2) {
            noteText = '🌅 Moon rising during golden hour — excellent foreground element!';
        }
    }
    if (!noteText && moon.set && ghPm) {
        const setH = parseHour(moon.set);
        const ghEndH = parseHour(ghPm);
        if (Math.abs(setH - ghEndH) <= 2) {
            noteText = '🌅 Moon setting during golden hour — excellent foreground element!';
        }
    }

    // Phase-specific notes
    if (!noteText) {
        switch (phaseName) {
            case 'New Moon':
                noteText = '🌌 New moon — prime time for Milky Way and astrophotography!';
                break;
            case 'Full Moon':
                noteText = '🌕 Full moon — moonlit landscapes possible, but stars will be washed out.';
                if (moon.rise && moon.set) {
                    const riseH = parseHour(moon.rise);
                    const setH = parseHour(moon.set);
                    if (Math.abs(riseH - 19) <= 1) {
                        noteText += ' Rising near sunset — huge moon illusion on horizon!';
                    }
                }
                break;
            case 'Waxing Crescent':
                noteText = '🌒 Thin crescent — great for starry night silhouettes with moon.';
                break;
            case 'Waning Crescent':
                noteText = '🌘 Thin crescent before dawn — great for pre-sunrise star shots.';
                break;
            default:
                noteText = '';
        }
    }

    if (noteText) {
        note.textContent = noteText;
        note.style.display = 'block';
    } else {
        note.style.display = 'none';
    }
};
