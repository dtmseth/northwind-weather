/* Northwind Weather — Push notifications for high-score days */

const NOTIF_KEY = 'nw_notified_days';
const NOTIF_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
let notifSubscribed = false;

window.initNotifications = function(dailyData) {
    const toggle = document.getElementById('notif-toggle');
    if (!toggle) return;

    // Check if subscribed
    notifSubscribed = localStorage.getItem('nw_notif_subscribed') === 'true';
    if (notifSubscribed) {
        toggle.classList.add('subscribed');
    }

    toggle.addEventListener('click', async () => {
        if (notifSubscribed) {
            // Unsubscribe
            notifSubscribed = false;
            localStorage.setItem('nw_notif_subscribed', 'false');
            toggle.classList.remove('subscribed');
            document.getElementById('notifications-bar').style.display = 'none';
            return;
        }

        if (!('Notification' in window)) {
            alert('Notifications not supported on this browser.');
            return;
        }

        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            notifSubscribed = true;
            localStorage.setItem('nw_notif_subscribed', 'true');
            toggle.classList.add('subscribed');
            // Fire a test notification
            new Notification('Northwind Weather', {
                body: '🔔 Notifications enabled! You\'ll be alerted on great photo days.',
                icon: '/favicon.ico',
            });
            // Check and notify for upcoming days
            checkAndNotify(dailyData);
        } else {
            alert('Notification permission denied. Check your browser settings.');
        }
    });

    // If already subscribed, show upcoming days
    if (notifSubscribed && dailyData) {
        showUpcomingHighScoreDays(dailyData);
    }

    // Periodic check
    setInterval(() => {
        if (notifSubscribed) {
            checkAndNotify(dailyData);
        }
    }, NOTIF_CHECK_INTERVAL);
};

function getNotifiedDays() {
    try {
        return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    } catch { return []; }
}

function markNotified(dateStr) {
    const days = getNotifiedDays();
    if (!days.includes(dateStr)) {
        days.push(dateStr);
        localStorage.setItem(NOTIF_KEY, JSON.stringify(days));
    }
}

function checkAndNotify(dailyData) {
    if (!dailyData || !Array.isArray(dailyData)) return;
    if (!notifSubscribed) return;

    const notified = getNotifiedDays();
    const now = new Date();

    for (const day of dailyData) {
        if (!day || !day.date) continue;

        // Check if within 48 hours
        const dayDate = new Date(day.date + 'T12:00:00');
        const diffHours = (dayDate - now) / (1000 * 60 * 60);
        if (diffHours < 0 || diffHours > 48) continue;

        // Already notified?
        if (notified.includes(day.date)) continue;

        // High score day?
        const score = (day.cloud_score && day.cloud_score.score) || 0;
        if (score >= 7) {
            const sunrise = formatTime(day.sun && day.sun.sunrise);
            const sunset = formatTime(day.sun && day.sun.sunset);
            const ghPm = formatTime(day.sun && day.sun.golden_hour_pm_start);

            const isTomorrow = diffHours < 24 && diffHours > 0;
            const when = isTomorrow ? 'Tomorrow' : 'Today';

            try {
                new Notification('📸 Great photo conditions!', {
                    body: `${when}: Sky interest ${score}/10, golden hour at ${ghPm}, sunrise ${sunrise}.`,
                    icon: '/favicon.ico',
                    tag: `nw-${day.date}`,
                });
                markNotified(day.date);
            } catch (e) {
                // Notification might fail in some contexts
            }
        }
    }

    // Update the upcoming days list
    showUpcomingHighScoreDays(dailyData);
}

function showUpcomingHighScoreDays(dailyData) {
    const bar = document.getElementById('notifications-bar');
    const list = document.getElementById('high-score-days');
    if (!bar || !list || !dailyData) return;

    const highScoreDays = dailyData.filter(d => {
        const score = (d.cloud_score && d.cloud_score.score) || 0;
        return score >= 7;
    });

    if (highScoreDays.length === 0) {
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'block';
    list.innerHTML = highScoreDays.map(d => {
        const score = (d.cloud_score && d.cloud_score.score) || 0;
        const date = new Date(d.date + 'T12:00:00');
        const dayName = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const ghAm = formatTime(d.sun && d.sun.golden_hour_am_start);
        const ghPm = formatTime(d.sun && d.sun.golden_hour_pm_start);
        return `
            <div class="high-score-item">
                <span>${dayName}</span>
                <span>Score: <strong>${score}/10</strong></span>
                <span>🌅 ${ghAm} / ${ghPm}</span>
            </div>
        `;
    }).join('');
}

window.checkAndNotify = checkAndNotify;
