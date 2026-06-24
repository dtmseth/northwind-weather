/* Northwind Weather — Hash-based router for 5-tab layout */

window.initRouter = function() {
    var pages = ['today', 'sky', 'radar', '7day', 'sun'];

    function navigate() {
        var hash = window.location.hash.replace('#', '') || 'today';
        if (pages.indexOf(hash) === -1) hash = 'today';

        // Hide all pages
        pages.forEach(function(p) {
            var el = document.getElementById('page-' + p);
            if (el) {
                el.classList.remove('active');
                el.style.display = 'none';
            }
        });

        // Show target page
        var target = document.getElementById('page-' + hash);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }

        // Update nav active state
        var navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(item) {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === hash) {
                item.classList.add('active');
            }
        });

        // Fix Leaflet map when radar page becomes visible
        if (hash === 'radar' && window._mapInstance) {
            setTimeout(function() {
                if (window._mapInstance.invalidateSize) {
                    window._mapInstance.invalidateSize();
                }
            }, 200);
        }
    }

    window.addEventListener('hashchange', navigate);
    navigate(); // Run on load
};
