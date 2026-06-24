/* Northwind Weather — boot diagnostic: first JS to execute */

(function() {
    // Write a visible marker proving JS is running
    var d = document;
    if (!d.getElementById) return;
    var body = d.body;
    if (!body) return;
    var diag = d.createElement('div');
    diag.id = 'js-boot-marker';
    diag.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff4444;color:white;text-align:center;padding:8px;font-size:14px;font-family:monospace';
    diag.textContent = '✅ JS BOOT OK — ' + new Date().toLocaleTimeString();
    body.insertBefore(diag, body.firstChild);

    // Override loading text to prove DOMContentLoaded fires
    d.addEventListener('DOMContentLoaded', function() {
        var ld = d.getElementById('loading');
        if (ld) {
            var p = ld.querySelector('p');
            if (p) p.textContent = '⏳ DOM ready, starting fetch...';
        }
        var marker = d.getElementById('js-boot-marker');
        if (marker) marker.textContent += ' | DOMContentLoaded fired';
    });
})();
