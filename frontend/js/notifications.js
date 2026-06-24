/* Northwind Weather — Push notifications + in-app alerts panel */

const NOTIF_KEY = 'nw_notified_days';
const NOTIF_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
let notifSubscribed = false;

window.initNotifications = function(dailyData) {
    const toggle = document.getElementById('notif-toggle');
    if (!toggle) return;

    // Guard: only bind once to prevent duplicate listeners on re-render
    if (window._notifBound) return;
    window._notifBound = true;

    notifSubscribed = localStorage.getItem('nw_notif_subscribed') === 'true';
    if (notifSubscribed) toggle.classList.add('subscribed');

    toggle.addEventListener('click', function() {
        var bar = document.getElementById('notifications-bar');
        if (!bar) return;

        if (bar.style.display === 'block') {
            // Close panel
            bar.style.display = 'none';
            toggle.classList.remove('subscribed');
            localStorage.setItem('nw_notif_subscribed', 'false');
            notifSubscribed = false;
        } else {
            // Open panel — always works, even on iOS
            bar.style.display = 'block';
            toggle.classList.add('subscribed');
            notifSubscribed = true;
            localStorage.setItem('nw_notif_subscribed', 'true');

            if (dailyData) showUpcomingHighScoreDays(dailyData);

            // Progressive enhancement: OS push if supported
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(function(perm) {
                    if (perm === 'granted') {
                        try {
                            new Notification('Northwind Weather', {
                                body: 'Notifications enabled for great photo days.',
                            });
                            checkAndNotify(dailyData);
                        } catch(e) {}
                    }
                });
            }
        }
    });

    // Show panel if already subscribed and data available
    if (notifSubscribed && dailyData) {
        showUpcomingHighScoreDays(dailyData);
    }

    // Periodic check for OS push
    setInterval(function() {
        if (notifSubscribed && dailyData) checkAndNotify(dailyData);
    }, NOTIF_CHECK_INTERVAL);
};

function getNotifiedDays() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); }
    catch(e) { return []; }
}

function markNotified(dateStr) {
    var days = getNotifiedDays();
    if (days.indexOf(dateStr) === -1) {
        days.push(dateStr);
        localStorage.setItem(NOTIF_KEY, JSON.stringify(days));
    }
}

function checkAndNotify(dailyData) {
    if (!dailyData || !Array.isArray(dailyData)) return;
    if (!notifSubscribed) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    var notified = getNotifiedDays();
    var now = new Date();

    for (var i = 0; i < dailyData.length; i++) {
        var day = dailyData[i];
        if (!day || !day.date) continue;

        var dayDate = new Date(day.date + 'T12:00:00');
        var diffHours = (dayDate - now) / (1000 * 60 * 60);
        if (diffHours < 0 || diffHours > 48) continue;
        if (notified.indexOf(day.date) !== -1) continue;

        var score = (day.cloud_score && day.cloud_score.score) || 0;
        if (score >= 7) {
            var ghPm = formatTime(day.sun && day.sun.golden_hour_pm_start);
            var when = diffHours < 24 ? 'Tomorrow' : 'Today';
            try {
                new Notification('Great photo conditions!', {
                    body: when + ': Sky interest ' + score + '/10, golden hour at ' + ghPm + '.',
                    tag: 'nw-' + day.date,
                });
                markNotified(day.date);
            } catch(e) {}
        }
    }
    showUpcomingHighScoreDays(dailyData);
}

function showUpcomingHighScoreDays(dailyData) {
    var bar = document.getElementById('notifications-bar');
    var list = document.getElementById('high-score-days');
    if (!bar || !list || !dailyData) return;

    var highScoreDays = dailyData.filter(function(d) {
        var score = (d.cloud_score && d.cloud_score.score) || 0;
        return score >= 7;
    });

    if (highScoreDays.length === 0) {
        list.innerHTML = '<div class="high-score-item"><span>No high-score days in the next 7 days</span></div>';
        return;
    }

    list.innerHTML = highScoreDays.map(function(d) {
        var score = (d.cloud_score && d.cloud_score.score) || 0;
        var date = new Date(d.date + 'T12:00:00');
        var dayName = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        var ghAm = formatTime(d.sun && d.sun.golden_hour_am_start);
        var ghPm = formatTime(d.sun && d.sun.golden_hour_pm_start);
        return '<div class="high-score-item">' +
            '<span>' + dayName + '</span>' +
            '<span>Score: <strong>' + score + '/10</strong></span>' +
            '<span>GH: ' + ghAm + ' / ' + ghPm + '</span>' +
            '</div>';
    }).join('');
}

window.checkAndNotify = checkAndNotify;
