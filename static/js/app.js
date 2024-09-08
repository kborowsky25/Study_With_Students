
// static/js/cache-control.js

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was restored from the cache
        // Redirect or refresh to ensure session state is valid
        window.location.reload(true);
    }
});
